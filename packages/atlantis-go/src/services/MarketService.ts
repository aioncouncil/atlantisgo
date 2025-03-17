/**
 * @file MarketService.ts
 * @description Service for handling marketplace, transactions, and resources
 */

import { MarketRepository, ResourceInventoryDocument, MarketListingDocument, TransactionDocument } from '../database/repositories/MarketRepository.js';
import { getDatabase, connectDatabase } from '../database/index.js';
import { nanoid } from 'nanoid';

/**
 * Economic layers of the market
 */
const ECONOMIC_LAYERS = {
  PORT: "Basic exchange of resources and items",
  LAWS: "Advanced marketplace with contracts and services",
  REPUBLIC: "High-level economic governance and policy"
};

/**
 * Resource types available in the game
 */
const RESOURCE_TYPES = {
  DATA: "Digital information and statistics",
  ENERGY: "Power for devices and abilities",
  WISDOM: "Knowledge and insights",
  MATERIALS: "Physical construction resources",
  INFLUENCE: "Social capital and connections",
  CURRENCY: "Standard coins for transactions"
};

/**
 * Market Service for handling marketplace functionality
 */
class MarketService {
  private repository: MarketRepository;
  private mockData: boolean = false;
  
  constructor() {
    this.repository = new MarketRepository();
  }
  
  /**
   * Initialize the service, connecting to database
   */
  async initialize(): Promise<void> {
    try {
      await connectDatabase();
      console.log("MarketService initialized with database connection");
    } catch (error) {
      console.error("Failed to initialize MarketService:", error);
      this.mockData = true;
      console.log("Using mock data for MarketService");
    }
  }
  
  /**
   * Get a resource inventory for an owner
   */
  async getResourceInventory(ownerId: string, ownerType: string): Promise<ResourceInventoryDocument | null> {
    try {
      return await this.repository.getResourceInventory(ownerId, ownerType);
    } catch (error) {
      console.error(`Error getting resource inventory for ${ownerType} ${ownerId}:`, error);
      return null;
    }
  }
  
  /**
   * Update a resource inventory
   */
  async updateResourceInventory(
    ownerId: string,
    ownerType: string,
    resources: Record<string, number>,
    maxCapacity?: Record<string, number>
  ): Promise<boolean> {
    try {
      return await this.repository.updateResourceInventory(ownerId, ownerType, resources, maxCapacity);
    } catch (error) {
      console.error(`Error updating resource inventory for ${ownerType} ${ownerId}:`, error);
      return false;
    }
  }
  
  /**
   * Add resources to an inventory
   */
  async addResources(
    ownerId: string,
    ownerType: string,
    resources: Record<string, number>
  ): Promise<boolean> {
    try {
      return await this.repository.addResources(ownerId, ownerType, resources);
    } catch (error) {
      console.error(`Error adding resources to ${ownerType} ${ownerId}:`, error);
      return false;
    }
  }
  
  /**
   * Remove resources from an inventory
   */
  async removeResources(
    ownerId: string,
    ownerType: string,
    resources: Record<string, number>
  ): Promise<boolean> {
    try {
      return await this.repository.removeResources(ownerId, ownerType, resources);
    } catch (error) {
      console.error(`Error removing resources from ${ownerType} ${ownerId}:`, error);
      return false;
    }
  }
  
  /**
   * Transfer resources between inventories
   */
  async transferResources(
    fromOwnerId: string,
    fromOwnerType: string,
    toOwnerId: string,
    toOwnerType: string,
    resources: Record<string, number>
  ): Promise<boolean> {
    try {
      // First check if sender has enough resources
      const fromInventory = await this.repository.getResourceInventory(fromOwnerId, fromOwnerType);
      if (!fromInventory) {
        throw new Error(`Source inventory for ${fromOwnerType} ${fromOwnerId} not found`);
      }
      
      // Check if there are enough resources
      for (const [type, quantity] of Object.entries(resources)) {
        const available = fromInventory.resources[type] || 0;
        if (available < quantity) {
          throw new Error(`Not enough ${type} resources (have ${available}, need ${quantity})`);
        }
      }
      
      // Remove from sender
      const removeResult = await this.repository.removeResources(fromOwnerId, fromOwnerType, resources);
      if (!removeResult) {
        throw new Error("Failed to remove resources from sender");
      }
      
      // Add to recipient
      const addResult = await this.repository.addResources(toOwnerId, toOwnerType, resources);
      if (!addResult) {
        // Rollback the removal if adding fails
        await this.repository.addResources(fromOwnerId, fromOwnerType, resources);
        throw new Error("Failed to add resources to recipient");
      }
      
      return true;
    } catch (error) {
      console.error(`Error transferring resources from ${fromOwnerType} ${fromOwnerId} to ${toOwnerType} ${toOwnerId}:`, error);
      return false;
    }
  }
  
  /**
   * Create a market listing
   */
  async createListing(listing: Partial<MarketListingDocument>): Promise<MarketListingDocument | null> {
    try {
      if (!listing.title || !listing.seller || !listing.item || !listing.pricing) {
        throw new Error("Listing must have title, seller, item, and pricing information");
      }
      
      const now = new Date();
      const expiresDate = new Date();
      expiresDate.setDate(now.getDate() + 7); // Default 7-day listing
      
      const listingDoc: Omit<MarketListingDocument, '_id' | 'createdAt' | 'updatedAt'> = {
        title: listing.title,
        description: listing.description || "",
        seller: {
          id: listing.seller.id,
          type: listing.seller.type,
          name: listing.seller.name,
          rating: listing.seller.rating || 0
        },
        item: {
          type: listing.item.type,
          id: listing.item.id,
          properties: listing.item.properties || {},
          images: listing.item.images || []
        },
        pricing: {
          price: listing.pricing.price,
          currency: listing.pricing.currency || "Coins",
          negotiable: listing.pricing.negotiable || false,
          auction: listing.pricing.auction,
          economicLayer: listing.pricing.economicLayer || "PORT"
        },
        status: "Active",
        listed: now,
        expires: listing.expires || expiresDate,
        terms: listing.terms || {
          delivery: "Immediate",
          returns: false,
          conditions: []
        },
        tags: listing.tags || []
      };
      
      return await this.repository.createListing(listingDoc);
    } catch (error) {
      console.error("Error creating market listing:", error);
      return null;
    }
  }
  
  /**
   * Get market listings with optional filtering
   */
  async getListings(
    filter: Partial<MarketListingDocument> = {},
    limit: number = 100
  ): Promise<MarketListingDocument[]> {
    try {
      // Always include active status unless explicitly filtered
      if (!filter.status) {
        filter.status = "Active";
      }
      
      return await this.repository.findListings(filter, limit);
    } catch (error) {
      console.error("Error getting market listings:", error);
      return [];
    }
  }
  
  /**
   * Get a market listing by ID
   */
  async getListingById(id: string): Promise<MarketListingDocument | null> {
    try {
      return await this.repository.findListingById(id);
    } catch (error) {
      console.error(`Error getting market listing with ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Update a market listing
   */
  async updateListing(id: string, updates: Partial<MarketListingDocument>): Promise<boolean> {
    try {
      return await this.repository.updateListing(id, updates);
    } catch (error) {
      console.error(`Error updating market listing with ID ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Cancel a market listing
   */
  async cancelListing(id: string): Promise<boolean> {
    try {
      return await this.repository.cancelListing(id);
    } catch (error) {
      console.error(`Error cancelling market listing with ID ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Place a bid on an auction listing
   */
  async placeBid(listingId: string, userId: string, amount: number): Promise<boolean> {
    try {
      return await this.repository.placeBid(listingId, userId, amount);
    } catch (error) {
      console.error(`Error placing bid for user ${userId} on listing ${listingId}:`, error);
      return false;
    }
  }
  
  /**
   * Purchase an item from a listing
   */
  async purchaseItem(
    listingId: string,
    buyerId: string,
    buyerType: string = "User"
  ): Promise<TransactionDocument | null> {
    try {
      const listing = await this.repository.findListingById(listingId);
      if (!listing) {
        throw new Error(`Listing with ID ${listingId} not found`);
      }
      
      if (listing.status !== "Active") {
        throw new Error(`Listing is not active (status: ${listing.status})`);
      }
      
      // Check if auction and handle accordingly
      if (listing.pricing.auction) {
        const now = new Date();
        if (now < listing.pricing.auction.endTime) {
          throw new Error("Auction is still in progress");
        }
        
        // Check if buyer is highest bidder
        const highestBid = listing.pricing.auction.bidHistory.sort((a, b) => b.amount - a.amount)[0];
        if (!highestBid || highestBid.userId !== buyerId) {
          throw new Error("Only the highest bidder can complete the purchase");
        }
      }
      
      // Create the transaction
      const now = new Date();
      const transaction: Omit<TransactionDocument, '_id'> = {
        type: "Purchase",
        buyer: {
          id: buyerId,
          type: buyerType
        },
        seller: {
          id: listing.seller.id,
          type: listing.seller.type
        },
        item: {
          type: listing.item.type,
          id: listing.item.id,
          name: listing.title,
          details: listing.item.properties
        },
        financial: {
          amount: listing.pricing.auction ? 
                  listing.pricing.auction.currentBid : 
                  listing.pricing.price,
          currency: listing.pricing.currency,
          fee: 0.05 * listing.pricing.price, // 5% marketplace fee
          taxesIncluded: true
        },
        timestamps: {
          created: now
        },
        status: "Pending",
        marketListingId: listingId,
        metadata: {}
      };
      
      // Create the transaction and mark listing as sold
      const result = await this.repository.createTransaction(transaction);
      
      if (result) {
        // Transfer the payment from buyer to seller
        const resources = {
          [transaction.financial.currency]: transaction.financial.amount
        };
        
        // In a real implementation, would verify funds first
        await this.transferResources(buyerId, buyerType, listing.seller.id, listing.seller.type, resources);
        
        // Mark transaction as completed
        await this.repository.updateTransactionStatus(result._id.toString(), "Completed");
      }
      
      return result;
    } catch (error) {
      console.error(`Error purchasing item from listing ${listingId} by buyer ${buyerId}:`, error);
      return null;
    }
  }
  
  /**
   * Get transactions for a user
   */
  async getUserTransactions(userId: string): Promise<TransactionDocument[]> {
    try {
      return await this.repository.getUserTransactions(userId);
    } catch (error) {
      console.error(`Error getting transactions for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<TransactionDocument | null> {
    try {
      return await this.repository.findTransactionById(id);
    } catch (error) {
      console.error(`Error getting transaction with ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Update transaction status
   */
  async updateTransactionStatus(id: string, status: string): Promise<boolean> {
    try {
      return await this.repository.updateTransactionStatus(id, status);
    } catch (error) {
      console.error(`Error updating status for transaction ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Create a reward transaction (e.g., for completing experiences)
   */
  async createRewardTransaction(
    userId: string,
    rewards: {
      coins?: number;
      resources?: Record<string, number>;
      items?: { id: string; type: string; name: string; }[];
    }
  ): Promise<TransactionDocument | null> {
    try {
      const now = new Date();
      
      // Add coins to resources if present
      const resources = { ...rewards.resources };
      if (rewards.coins && rewards.coins > 0) {
        resources.COINS = (resources.COINS || 0) + rewards.coins;
      }
      
      // Create the transaction
      const transaction: Omit<TransactionDocument, '_id'> = {
        type: "Reward",
        buyer: {
          id: userId,
          type: "User"
        },
        seller: {
          id: "system",
          type: "System"
        },
        item: {
          type: "Reward",
          name: "Experience Reward",
          details: {
            resources,
            items: rewards.items || []
          }
        },
        financial: {
          amount: rewards.coins || 0,
          currency: "Coins",
          fee: 0,
          taxesIncluded: true
        },
        timestamps: {
          created: now,
          completed: now
        },
        status: "Completed",
        metadata: {
          source: "Experience",
          timestamp: now.toISOString()
        }
      };
      
      // Create transaction
      const result = await this.repository.createTransaction(transaction);
      
      if (result) {
        // Add resources to user inventory
        if (Object.keys(resources).length > 0) {
          await this.addResources(userId, "User", resources);
        }
        
        // In a real implementation, would also handle item awards
      }
      
      return result;
    } catch (error) {
      console.error(`Error creating reward transaction for user ${userId}:`, error);
      return null;
    }
  }
  
  /**
   * Get the access level for a user based on their economic tier
   */
  getEconomicTierAccess(tier: string): string[] {
    const tiers = {
      PORT: ["PORT"],
      LAWS: ["PORT", "LAWS"],
      REPUBLIC: ["PORT", "LAWS", "REPUBLIC"]
    };
    
    return tiers[tier] || tiers.PORT;
  }
  
  /**
   * Check if a user can access a specific economic layer
   */
  canAccessEconomicLayer(userTier: string, requiredLayer: string): boolean {
    const access = this.getEconomicTierAccess(userTier);
    return access.includes(requiredLayer);
  }
  
  /**
   * Get resource costs for different economic levels
   */
  getResourceRequirements(level: number): Record<string, number> {
    const requirements = {
      1: { DATA: 100, ENERGY: 100 },
      2: { DATA: 500, ENERGY: 500, WISDOM: 100 },
      3: { DATA: 2000, ENERGY: 2000, WISDOM: 500, MATERIALS: 500 },
      4: { DATA: 10000, ENERGY: 10000, WISDOM: 2000, MATERIALS: 2000, INFLUENCE: 1000 }
    };
    
    return requirements[level] || requirements[1];
  }
}

export default new MarketService(); 