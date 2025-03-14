/**
 * WorldScene
 * Main game scene for the world map
 */
import { network } from '../network.js';
import { ui } from '../ui.js';
import { ZONE_TYPES, POWER_TYPES, DEBUG_MODE } from '../constants.js';
import { playerImageData } from '../../assets/img/player.js';
import { otherPlayerImageData } from '../../assets/img/other-player.js';
import { powerImageData } from '../../assets/img/power.js';

export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
    console.log('WorldScene constructor called');
    
    // Player's world position
    this.playerPosition = { x: 0, y: 0 };
    
    // Camera offset - how far the camera is from the player
    this.cameraOffset = { x: 0, y: 0 };
    
    // Scale of the map (zoom level)
    this.mapScale = 1;
    
    // Step size for movement
    this.moveStep = 20;
    
    // Speed for smooth movement
    this.moveSpeed = 5;
    
    // World size
    this.worldSize = {
      width: 10000,
      height: 10000
    };
    
    // Entity containers
    this.entities = {
      players: {},
      powers: {},
      zones: {}
    };
    
    // Flag for backup textures
    this.usingBackupTextures = false;
  }

  preload() {
    console.log('WorldScene preload started');
    
    try {
      // Create backup textures in case loading fails
      console.log('Creating backup textures');
      this.createBackupTextures();
      
      // Check image data validity
      console.log('Checking image data validity');
      const isPlayerValid = playerImageData && playerImageData.length > 1000;
      const isOtherPlayerValid = otherPlayerImageData && otherPlayerImageData.length > 1000;
      const isPowerValid = powerImageData && powerImageData.length > 1000;
      
      console.log(`Player image data valid: ${isPlayerValid}`);
      console.log(`Other player image data valid: ${isOtherPlayerValid}`);
      console.log(`Power image data valid: ${isPowerValid}`);
      
      // Better texture loading with multiple fallback approaches
      const loadTexture = (key, imageData, fallbackColor) => {
        if (!imageData || imageData.length < 1000) {
          console.log(`Invalid image data for ${key}, using fallback`);
          this.createColoredTexture(key, fallbackColor);
          return;
        }
        
        try {
          // First attempt: Use Phaser's built-in texture loading
          this.textures.addBase64(key, imageData);
          console.log(`Successfully loaded ${key} texture via addBase64`);
        } catch (error) {
          console.error(`Failed to load ${key} via addBase64:`, error);
          
          try {
            // Second attempt: Create an image element and use it as texture
            const img = new Image();
            img.onload = () => {
              this.textures.addImage(key, img);
              console.log(`Successfully loaded ${key} texture via Image element`);
            };
            img.onerror = () => {
              console.error(`Failed to load ${key} via Image element`);
              this.createColoredTexture(key, fallbackColor);
            };
            img.src = imageData;
          } catch (innerError) {
            console.error(`All attempts to load ${key} failed:`, innerError);
            this.createColoredTexture(key, fallbackColor);
          }
        }
      };
      
      // Load textures with fallbacks
      loadTexture('player', playerImageData, 0x3498db);
      loadTexture('otherPlayer', otherPlayerImageData, 0xe74c3c);
      loadTexture('power', powerImageData, 0xf1c40f);
      
      // Create a simple particle texture for effects
      const particleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      particleGraphics.fillStyle(0xffffff, 1);
      particleGraphics.fillCircle(8, 8, 8);
      particleGraphics.generateTexture('particle', 16, 16);
      console.log('Created particle texture');
      
      // Create zone textures
      this.createZoneTextures();
      console.log('Created zone textures');
      
    } catch (error) {
      console.error('Error in preload:', error);
      this.usingBackupTextures = true;
    }
  }

  // Helper method to create a simple colored texture
  createColoredTexture(key, color) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(color, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircle(16, 16, 16);
    graphics.generateTexture(key, 32, 32);
    console.log(`Created colored fallback texture for ${key}`);
    this.usingBackupTextures = true;
  }

  create() {
    console.log('WorldScene create called');
    
    try {
      // Create grid background
      this.createGridBackground();
      console.log('Grid background created');
      
      // Create coordinate axes
      this.createCoordinateAxes();
      console.log('Coordinate axes created');
      
      // Create a world with bounds
      this.physics.world.setBounds(-this.worldSize.width/2, -this.worldSize.height/2, 
                                   this.worldSize.width, this.worldSize.height);
      console.log('World bounds set');
      
      // Create the player entity
      this.createPlayer();
      console.log('Player entity created');
      
      // Setup controls
      this.setupControls();
      console.log('Controls set up');
      
      // Initialize long press for touch controls if needed
      this.initTouchControls();
      console.log('Touch controls initialized');
      
      // Setup other UI
      this.setupMiniMap();
      console.log('Mini-map set up');
      
      // Set up network handlers
      this.setupNetworkHandlers();
      console.log('Network handlers set up');
      
      // Connect UI buttons
      this.connectUIButtons();
      console.log('UI buttons connected');
      
      console.log('WorldScene create completed successfully');
    } catch (error) {
      console.error('Error in create:', error);
    }
  }

  update() {
    // Update player if exists
    if (this.player) {
      // Update mini-map with player position
      this.updateMiniMap();
      
      // Update debug text
      if (this.debugText) {
        this.debugText.setText(
          `Position: (${Math.round(this.playerPosition.x)}, ${Math.round(this.playerPosition.y)})\n` +
          `Camera Offset: (${Math.round(this.cameraOffset.x)}, ${Math.round(this.cameraOffset.y)})\n` +
          `Scale: ${this.mapScale.toFixed(2)}\n` +
          `Entities: P:${Object.keys(this.entities.players).length} Z:${Object.keys(this.entities.zones).length} Pow:${Object.keys(this.entities.powers).length}`
        );
      }
    }
  }

  createGridBackground() {
    console.log('Creating grid background');
    
    // Make sure worldSize is defined
    if (!this.worldSize) {
      this.worldSize = { width: this.worldSize.width / 2, height: this.worldSize.height / 2 };
      console.log('Initialized worldSize as fallback', this.worldSize);
    }
    
    // Create a layered background for depth effect
    // Deep background
    this.add.rectangle(0, 0, this.worldSize.width * 2.5, this.worldSize.height * 2.5, 0x0a0a18).setOrigin(0.5);
    
    // Add a subtle gradient overlay using multiple transparent rectangles
    const gradientSteps = 8;
    const gradientWidth = this.worldSize.width * 2;
    const gradientHeight = this.worldSize.height * 2;
    
    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const size = 1 - (ratio * 0.5);
      const alpha = 0.03 + (ratio * 0.02);
      
      this.add.rectangle(
        0, 0, 
        gradientWidth * size, 
        gradientHeight * size, 
        0x3a5ba9, 
        alpha
      ).setOrigin(0.5);
    }
    
    // Create a more polished grid
    const gridSize = 200; // Larger grid cells for cleaner look
    const minorGridSize = 50; // Minor grid lines
    
    // Create graphics objects for different grid layers
    const majorGrid = this.add.graphics();
    const minorGrid = this.add.graphics();
    
    // Draw minor grid
    minorGrid.lineStyle(1, 0x3a4a6a, 0.15);
    
    for (let x = -this.worldSize.width; x <= this.worldSize.width; x += minorGridSize) {
      minorGrid.beginPath();
      minorGrid.moveTo(x, -this.worldSize.height);
      minorGrid.lineTo(x, this.worldSize.height);
      minorGrid.strokePath();
    }
    
    for (let y = -this.worldSize.height; y <= this.worldSize.height; y += minorGridSize) {
      minorGrid.beginPath();
      minorGrid.moveTo(-this.worldSize.width, y);
      minorGrid.lineTo(this.worldSize.width, y);
      minorGrid.strokePath();
    }
    
    // Draw major grid lines
    majorGrid.lineStyle(2, 0x5a6a8a, 0.3);
    
    for (let x = -this.worldSize.width; x <= this.worldSize.width; x += gridSize) {
      majorGrid.beginPath();
      majorGrid.moveTo(x, -this.worldSize.height);
      majorGrid.lineTo(x, this.worldSize.height);
      majorGrid.strokePath();
    }
    
    for (let y = -this.worldSize.height; y <= this.worldSize.height; y += gridSize) {
      majorGrid.beginPath();
      majorGrid.moveTo(-this.worldSize.width, y);
      majorGrid.lineTo(this.worldSize.width, y);
      majorGrid.strokePath();
    }
    
    // Add coordinate system with fade-out effect
    const axisGraphics = this.add.graphics();
    
    // X and Y axes with thicker lines
    axisGraphics.lineStyle(3, 0x6a8ac9, 0.6);
    
    // X axis
    axisGraphics.beginPath();
    axisGraphics.moveTo(-this.worldSize.width, 0);
    axisGraphics.lineTo(this.worldSize.width, 0);
    axisGraphics.strokePath();
    
    // Y axis
    axisGraphics.beginPath();
    axisGraphics.moveTo(0, -this.worldSize.height);
    axisGraphics.lineTo(0, this.worldSize.height);
    axisGraphics.strokePath();
    
    // Add subtle circular markers at grid intersections for visual interest
    const intersectionMarkers = this.add.graphics();
    intersectionMarkers.fillStyle(0x5a6a8a, 0.2);
    
    for (let x = -this.worldSize.width; x <= this.worldSize.width; x += gridSize) {
      for (let y = -this.worldSize.height; y <= this.worldSize.height; y += gridSize) {
        // Make markers at the origin more prominent
        const distance = Math.sqrt(x*x + y*y);
        const size = Math.max(1, 5 - (distance / 2000));
        const alpha = Math.max(0.1, 0.3 - (distance / 15000));
        
        intersectionMarkers.fillStyle(0x6a8ac9, alpha);
        intersectionMarkers.fillCircle(x, y, size);
      }
    }
    
    // Set the depth of the backgrounds to be behind other elements
    minorGrid.setDepth(-10);
    majorGrid.setDepth(-9);
    axisGraphics.setDepth(-8);
    intersectionMarkers.setDepth(-7);
    
    console.log('Enhanced grid background created');
  }

  createCoordinateAxes() {
    // Create X and Y axes for debugging
    const axisLength = 1000;
    
    // X-axis (red)
    const xAxis = this.add.graphics();
    xAxis.lineStyle(4, 0xff0000, 1);
    xAxis.moveTo(0, 0);
    xAxis.lineTo(axisLength, 0);
    
    // Y-axis (green)
    const yAxis = this.add.graphics();
    yAxis.lineStyle(4, 0x00ff00, 1);
    yAxis.moveTo(0, 0);
    yAxis.lineTo(0, axisLength);
    
    // Add labels
    this.add.text(axisLength + 10, 0, 'X', { 
      font: '24px Arial', 
      fill: '#ff0000' 
    }).setOrigin(0, 0.5);
    
    this.add.text(0, axisLength + 10, 'Y', { 
      font: '24px Arial', 
      fill: '#00ff00' 
    }).setOrigin(0.5, 0);
  }

  createTestEntities() {
    // Create test powers
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const power = this.physics.add.sprite(x, y, 'power');
      power.setDepth(20);
      
      // Generate a random power type
      const powerTypes = ['Wisdom', 'Courage', 'Temperance', 'Justice'];
      const type = powerTypes[Math.floor(Math.random() * powerTypes.length)];
      
      // Set tint based on type
      const powerColors = {
        'Wisdom': 0x3a86ff,
        'Courage': 0xff006e,
        'Temperance': 0x8ac926,
        'Justice': 0xffbe0b
      };
      power.setTint(powerColors[type]);
      
      // Add to entities
      this.entities.powers[`test_${i}`] = power;
    }
    
    // Create test zones
    for (let i = 0; i < 3; i++) {
      const x = (Math.random() - 0.5) * 1500;
      const y = (Math.random() - 0.5) * 1500;
      const radius = 100 + Math.random() * 200;
      
      // Generate a random zone type
      const zoneTypes = ['hub', 'residential', 'commercial', 'industrial', 'cultural'];
      const type = zoneTypes[Math.floor(Math.random() * zoneTypes.length)];
      
      // Create zone sprite
      const zone = this.add.image(x, y, `zone-${type}`);
      zone.setDepth(10);
      zone.setAlpha(0.6);
      zone.setDisplaySize(radius * 2, radius * 2);
      
      // Add to entities
      this.entities.zones[`test_${i}`] = zone;
    }
  }

  createZoneTextures() {
    console.log('Creating enhanced zone textures');
    
    // Define zone types with richer color scheme and names
    const zoneTypes = {
      hub: { color: 0x3a86ff, name: 'Hub', description: 'Civic Center' },
      residential: { color: 0x8ac926, name: 'Residential', description: 'Living Area' },
      commercial: { color: 0xffbe0b, name: 'Commercial', description: 'Business District' },
      industrial: { color: 0xff006e, name: 'Industrial', description: 'Production Zone' },
      cultural: { color: 0x9d4edd, name: 'Cultural', description: 'Arts District' },
      default: { color: 0x8ecae6, name: 'Zone', description: 'General Area' }
    };
    
    // Create more visually interesting zone textures
    for (const type in zoneTypes) {
      try {
        const zoneData = zoneTypes[type];
        const color = zoneData.color;
        
        // Convert hex to rgb
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        
        // Create a canvas for this zone type
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Larger size for better quality
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create radial gradient for main fill
        const gradient = ctx.createRadialGradient(
          256, 256, 50,
          256, 256, 240
        );
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.2)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`);
        
        // Fill circle with gradient
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(256, 256, 240, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a more decorative border with pattern
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
        ctx.lineWidth = 8;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(256, 256, 240, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add a secondary outer glow
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.arc(256, 256, 255, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add inner accent ring
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 15]);
        ctx.beginPath();
        ctx.arc(256, 256, 220, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add a subtle pattern inside
        ctx.setLineDash([]);
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i;
          const x1 = 256 + Math.cos(angle) * 100;
          const y1 = 256 + Math.sin(angle) * 100;
          const x2 = 256 + Math.cos(angle) * 200;
          const y2 = 256 + Math.sin(angle) * 200;
          
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        
        // Add the texture
        this.textures.addCanvas(`zone-${type}`, canvas);
        console.log(`Created enhanced zone-${type} texture`);
        
        // Also create a label texture for this zone
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256;
        labelCanvas.height = 80;
        const labelCtx = labelCanvas.getContext('2d');
        
        // Clear canvas
        labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        
        // Background with transparency
        labelCtx.fillStyle = `rgba(0, 0, 0, 0.6)`;
        labelCtx.roundRect(0, 0, 256, 80, 10);
        labelCtx.fill();
        
        // Add border
        labelCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
        labelCtx.lineWidth = 2;
        labelCtx.roundRect(0, 0, 256, 80, 10);
        labelCtx.stroke();
        
        // Add text
        labelCtx.fillStyle = '#ffffff';
        labelCtx.font = 'bold 24px Arial';
        labelCtx.textAlign = 'center';
        labelCtx.fillText(zoneData.name, 128, 30);
        
        labelCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
        labelCtx.font = '16px Arial';
        labelCtx.fillText(zoneData.description, 128, 55);
        
        // Add this as a texture
        this.textures.addCanvas(`zone-label-${type}`, labelCanvas);
        
      } catch (error) {
        console.error(`Error creating zone-${type} texture:`, error);
      }
    }
    
    console.log('Enhanced zone textures created successfully');
  }

  /**
   * Create backup textures in case loading fails
   */
  createBackupTextures() {
    try {
      console.log('Creating backup textures...');
      
      // Player texture - a blue circle with star icon
      const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      
      // Blue hexagon base
      playerGraphics.fillStyle(0x3498db, 1);
      playerGraphics.lineStyle(2, 0xffffff, 1);
      
      // Draw hexagon for player
      const size = 16;
      const sides = 6;
      playerGraphics.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI * 2) / sides;
        const x = size + Math.sin(angle) * size;
        const y = size + Math.cos(angle) * size;
        if (i === 0) {
          playerGraphics.moveTo(x, y);
        } else {
          playerGraphics.lineTo(x, y);
        }
      }
      playerGraphics.closePath();
      playerGraphics.fillPath();
      playerGraphics.strokePath();
      
      // Add star icon
      playerGraphics.fillStyle(0xffffff, 1);
      playerGraphics.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const outerX = size + Math.cos(angle) * 10;
        const outerY = size + Math.sin(angle) * 10;
        const innerAngle = angle + Math.PI / 5;
        const innerX = size + Math.cos(innerAngle) * 5;
        const innerY = size + Math.sin(innerAngle) * 5;
        
        if (i === 0) {
          playerGraphics.moveTo(outerX, outerY);
        } else {
          playerGraphics.lineTo(outerX, outerY);
        }
        playerGraphics.lineTo(innerX, innerY);
      }
      playerGraphics.closePath();
      playerGraphics.fillPath();
      
      playerGraphics.generateTexture('player', 32, 32);
      
      // Other player texture - a red circle with different pattern
      const otherPlayerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      otherPlayerGraphics.fillStyle(0xe74c3c, 1);
      otherPlayerGraphics.lineStyle(2, 0xffffff, 1);
      
      // Draw pentagon for other players
      const otherSize = 16;
      const otherSides = 5;
      otherPlayerGraphics.beginPath();
      for (let i = 0; i < otherSides; i++) {
        const angle = (i * Math.PI * 2) / otherSides;
        const x = otherSize + Math.sin(angle) * otherSize;
        const y = otherSize + Math.cos(angle) * otherSize;
        if (i === 0) {
          otherPlayerGraphics.moveTo(x, y);
        } else {
          otherPlayerGraphics.lineTo(x, y);
        }
      }
      otherPlayerGraphics.closePath();
      otherPlayerGraphics.fillPath();
      otherPlayerGraphics.strokePath();
      
      // Add cross icon
      otherPlayerGraphics.fillStyle(0xffffff, 1);
      otherPlayerGraphics.fillRect(otherSize - 8, otherSize - 2, 16, 4);
      otherPlayerGraphics.fillRect(otherSize - 2, otherSize - 8, 4, 16);
      
      otherPlayerGraphics.generateTexture('otherPlayer', 32, 32);
      
      // Power texture - a yellow diamond
      const powerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      powerGraphics.fillStyle(0xf1c40f, 1);
      powerGraphics.lineStyle(2, 0xffffff, 1);
      
      // Draw diamond for power
      powerGraphics.beginPath();
      powerGraphics.moveTo(16, 2);
      powerGraphics.lineTo(30, 16);
      powerGraphics.lineTo(16, 30);
      powerGraphics.lineTo(2, 16);
      powerGraphics.closePath();
      powerGraphics.fillPath();
      powerGraphics.strokePath();
      
      // Add a lightning bolt icon
      powerGraphics.fillStyle(0xffffff, 1);
      powerGraphics.beginPath();
      powerGraphics.moveTo(20, 8);  // Top point
      powerGraphics.lineTo(14, 16); // Middle left
      powerGraphics.lineTo(18, 16); // Middle center
      powerGraphics.lineTo(12, 24); // Bottom point
      powerGraphics.lineTo(22, 14); // Middle right
      powerGraphics.lineTo(16, 14); // Middle center again
      powerGraphics.closePath();
      powerGraphics.fillPath();
      
      powerGraphics.generateTexture('power', 32, 32);
      
      // Create a simple particle texture for effects
      const particleGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      particleGraphics.fillStyle(0xffffff, 1);
      particleGraphics.fillCircle(8, 8, 8);
      particleGraphics.generateTexture('particle', 16, 16);
      
      console.log('Backup textures created successfully');
    } catch (error) {
      console.error('Error creating backup textures:', error);
      
      // Fallback to even simpler textures as a last resort
      try {
        this.createColoredTexture('player', 0x3498db);
        this.createColoredTexture('otherPlayer', 0xe74c3c);
        this.createColoredTexture('power', 0xf1c40f);
        this.createColoredTexture('particle', 0xffffff);
        console.log('Created simplified backup textures as fallback');
      } catch (fallbackError) {
        console.error('Failed to create even simple backup textures:', fallbackError);
      }
    }
  }

  /**
   * Create the player entity
   */
  createPlayer() {
    console.log('Creating enhanced player entity');
    
    try {
      // Create a container to hold the player sprite and effects
      this.playerContainer = this.add.container(0, 0);
      
      // Add a subtle glow effect beneath the player
      const outerGlow = this.add.circle(0, 0, 40, 0x3498db, 0.15);
      const innerGlow = this.add.circle(0, 0, 25, 0x3498db, 0.3);
      
      // Add player base - create a hexagon shape for a more interesting design
      const hexagonPoints = [];
      const hexRadius = 18;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        hexagonPoints.push({
          x: hexRadius * Math.cos(angle),
          y: hexRadius * Math.sin(angle)
        });
      }
      
      const playerBase = this.add.polygon(0, 0, hexagonPoints, 0x3498db, 0.8);
      playerBase.setStrokeStyle(2, 0xffffff, 0.8);
      
      // Create main player circle
      const playerCircle = this.add.circle(0, 0, 12, 0x3498db, 1);
      playerCircle.setStrokeStyle(2, 0xffffff, 1);
      
      // Add directional indicator (arrow)
      const direction = this.add.triangle(0, -24, 0, -8, -8, 0, 8, 0, 0x3498db);
      direction.setAlpha(0.9);
      
      // Create a small icon/symbol in the center to represent the player identity
      // This could be an image later but we'll use a shape for now
      const playerIcon = this.add.star(0, 0, 5, 4, 8, 0xffffff, 0.9);
      
      // Create particle emitter for movement effect
      const particles = this.add.particles('particle');
      
      // Configure particle effect
      const emitter = particles.createEmitter({
        speed: { min: 10, max: 30 },
        scale: { start: 0.2, end: 0 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 800,
        blendMode: 'ADD',
        frequency: -1, // Don't emit automatically
      });
      
      // Connect emitter to player container
      emitter.startFollow(this.playerContainer);
      
      // Store the emitter for later use
      this.playerEmitter = emitter;
      
      // Add everything to the container in the right order
      this.playerContainer.add(outerGlow);
      this.playerContainer.add(innerGlow);
      this.playerContainer.add(playerBase);
      this.playerContainer.add(playerCircle);
      this.playerContainer.add(playerIcon);
      this.playerContainer.add(direction);
      
      // Add pulsing animation to the glow
      this.tweens.add({
        targets: innerGlow,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.5,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Add subtle rotation to the base
      this.tweens.add({
        targets: playerBase,
        angle: 360,
        duration: 30000,
        repeat: -1,
        ease: 'Linear'
      });
      
      // Add subtle floating motion
      this.tweens.add({
        targets: [playerCircle, playerIcon],
        y: '+=4',
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Set the player's depth so it appears above most other objects
      this.playerContainer.setDepth(50);
      
      // Create a selection ring that activates when clicked
      const selectionRing = this.add.circle(0, 0, 45, 0xffffff, 0);
      selectionRing.setStrokeStyle(2, 0xffffff, 0.6);
      selectionRing.setAlpha(0);
      this.playerContainer.add(selectionRing);
      
      // Show selection ring on click
      this.input.on('pointerdown', () => {
        selectionRing.setAlpha(1);
        this.tweens.add({
          targets: selectionRing,
          alpha: 0,
          scale: 1.5,
          duration: 800,
          ease: 'Cubic.easeOut'
        });
      });
      
      // Set player's initial position
      this.playerPosition = { x: 0, y: 0 };
      this.updatePlayerPosition();
      
      // Activate player with a nice scale-up animation
      this.playerContainer.setScale(0.1);
      this.tweens.add({
        targets: this.playerContainer,
        scale: 1,
        duration: 600,
        ease: 'Back.easeOut'
      });
      
      console.log('Enhanced player created successfully');
    } catch (error) {
      console.error('Error creating player:', error);
      
      // Create a fallback player representation if the texture failed
      this.playerContainer = this.add.container(0, 0);
      const fallbackPlayer = this.add.circle(0, 0, 15, 0xff5252);
      fallbackPlayer.setStrokeStyle(2, 0xffffff);
      this.playerContainer.add(fallbackPlayer);
      this.playerContainer.setDepth(50);
      
      // Set player's initial position
      this.playerPosition = { x: 0, y: 0 };
      this.updatePlayerPosition();
    }
  }

  /**
   * Setup mini-map in the top-right corner of the screen
   */
  setupMiniMap() {
    console.log('Setting up enhanced mini-map');
    
    try {
      // Create container for mini-map elements that will stay fixed on screen
      this.miniMapContainer = this.add.container(0, 0);
      this.miniMapContainer.setScrollFactor(0); // Fixed position on screen
      this.miniMapContainer.setDepth(1000); // Ensure it's on top of everything
      
      // Mini-map dimensions
      const minimapSize = {
        width: 200,
        height: 200
      };
      
      // Position in top-right corner with padding
      const minimapPosition = {
        x: this.cameras.main.width - minimapSize.width - 20,
        y: 20
      };
      
      // Background with styled border
      const miniMapBg = this.add.rectangle(
        minimapPosition.x + minimapSize.width / 2,
        minimapPosition.y + minimapSize.height / 2,
        minimapSize.width + 10,
        minimapSize.height + 10,
        0x000000,
        0.6
      );
      
      // Add inner background with grid pattern
      const miniMapInnerBg = this.add.rectangle(
        minimapPosition.x + minimapSize.width / 2,
        minimapPosition.y + minimapSize.height / 2,
        minimapSize.width,
        minimapSize.height,
        0x111122,
        0.9
      );
      
      // Create a grid pattern for the mini-map
      const gridGraphics = this.add.graphics();
      gridGraphics.lineStyle(1, 0x3a4a6a, 0.3);
      gridGraphics.fillStyle(0x3a4a6a, 0.1);
      
      // Draw mini grid
      const gridSize = 20;
      for (let x = 0; x < minimapSize.width; x += gridSize) {
        gridGraphics.beginPath();
        gridGraphics.moveTo(minimapPosition.x + x, minimapPosition.y);
        gridGraphics.lineTo(minimapPosition.x + x, minimapPosition.y + minimapSize.height);
        gridGraphics.strokePath();
      }
      
      for (let y = 0; y < minimapSize.height; y += gridSize) {
        gridGraphics.beginPath();
        gridGraphics.moveTo(minimapPosition.x, minimapPosition.y + y);
        gridGraphics.lineTo(minimapPosition.x + minimapSize.width, minimapPosition.y + y);
        gridGraphics.strokePath();
      }
      
      // Draw central marker
      gridGraphics.lineStyle(2, 0x6a8ac9, 0.8);
      gridGraphics.beginPath();
      gridGraphics.moveTo(
        minimapPosition.x + minimapSize.width / 2 - 10, 
        minimapPosition.y + minimapSize.height / 2
      );
      gridGraphics.lineTo(
        minimapPosition.x + minimapSize.width / 2 + 10, 
        minimapPosition.y + minimapSize.height / 2
      );
      gridGraphics.moveTo(
        minimapPosition.x + minimapSize.width / 2, 
        minimapPosition.y + minimapSize.height / 2 - 10
      );
      gridGraphics.lineTo(
        minimapPosition.x + minimapSize.width / 2, 
        minimapPosition.y + minimapSize.height / 2 + 10
      );
      gridGraphics.strokePath();
      
      // Add border with gradient
      const borderGraphics = this.add.graphics();
      borderGraphics.lineStyle(3, 0x3a86ff, 0.8);
      borderGraphics.strokeRect(
        minimapPosition.x,
        minimapPosition.y,
        minimapSize.width,
        minimapSize.height
      );
      
      // Create a player marker for the mini-map
      this.miniMapPlayer = this.add.circle(
        minimapPosition.x + minimapSize.width / 2,
        minimapPosition.y + minimapSize.height / 2,
        5,
        0x3498db,
        1
      );
      this.miniMapPlayer.setStrokeStyle(2, 0xffffff, 1);
      
      // Create a pulse effect around the player marker
      const playerPulse = this.add.circle(
        minimapPosition.x + minimapSize.width / 2,
        minimapPosition.y + minimapSize.height / 2,
        8,
        0x3498db,
        0.5
      );
      
      // Add pulsing animation
      this.tweens.add({
        targets: playerPulse,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        duration: 1500,
        repeat: -1,
        ease: 'Cubic.easeOut'
      });
      
      // Add a title to the mini-map
      const miniMapTitle = this.add.text(
        minimapPosition.x + minimapSize.width / 2,
        minimapPosition.y - 15,
        'WORLD MAP',
        {
          font: '12px Arial',
          fill: '#ffffff',
          align: 'center'
        }
      );
      miniMapTitle.setOrigin(0.5, 0.5);
      
      // Add a scale indicator
      const scaleBar = this.add.rectangle(
        minimapPosition.x + 20,
        minimapPosition.y + minimapSize.height - 15,
        40,
        3,
        0xffffff,
        0.8
      );
      
      const scaleText = this.add.text(
        minimapPosition.x + 20,
        minimapPosition.y + minimapSize.height - 5,
        '1000m',
        {
          font: '10px Arial',
          fill: '#ffffff'
        }
      );
      scaleText.setOrigin(0, 0.5);
      
      // Add to container - this ensures everything stays together
      this.miniMapContainer.add([
        miniMapBg,
        miniMapInnerBg,
        gridGraphics,
        borderGraphics,
        playerPulse,
        this.miniMapPlayer,
        miniMapTitle,
        scaleBar,
        scaleText
      ]);
      
      // Store mini-map configuration
      this.miniMap = {
        position: minimapPosition,
        size: minimapSize,
        scale: this.worldSize.width / minimapSize.width,
        zones: {},
        container: this.miniMapContainer
      };
      
      // Make mini-map interactive
      miniMapInnerBg.setInteractive();
      miniMapInnerBg.on('pointerdown', (pointer) => {
        // Calculate world position from mini-map click
        const worldX = (pointer.x - this.miniMap.position.x - this.miniMap.size.width / 2) * this.miniMap.scale;
        const worldY = (pointer.y - this.miniMap.position.y - this.miniMap.size.height / 2) * this.miniMap.scale;
        
        // Center camera on clicked position
        this.cameras.main.pan(worldX, worldY, 500, 'Power2');
        
        // Show a click indicator
        const clickMarker = this.add.circle(
          pointer.x, 
          pointer.y, 
          5, 
          0xffffff, 
          0.8
        );
        clickMarker.setScrollFactor(0);
        
        // Animate and remove
        this.tweens.add({
          targets: clickMarker,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 300,
          onComplete: () => clickMarker.destroy()
        });
      });
      
      console.log('Enhanced mini-map setup complete');
    } catch (error) {
      console.error('Error setting up mini-map:', error);
    }
  }

  /**
   * Update the mini-map with player position and zone info
   */
  updateMiniMap() {
    if (!this.miniMap || !this.miniMapPlayer) return;
    
    try {
      // Calculate minimap center and player position
      const centerX = this.miniMap.position.x + this.miniMap.size.width / 2;
      const centerY = this.miniMap.position.y + this.miniMap.size.height / 2;
      
      // Calculate player position on minimap based on world position
      const playerX = centerX + (this.playerPosition.x / this.miniMap.scale);
      const playerY = centerY + (this.playerPosition.y / this.miniMap.scale);
      
      // Update player marker
      this.miniMapPlayer.setPosition(playerX, playerY);
      
      // Update zone markers
      if (this.entities.zones) {
        Object.entries(this.entities.zones).forEach(([zoneId, zoneData]) => {
          // Convert world position to mini-map position
          const miniX = centerX + (zoneData.x / this.miniMap.scale);
          const miniY = centerY + (zoneData.y / this.miniMap.scale);
          
          // Size on mini-map proportional to world size
          const miniRadius = zoneData.radius / this.miniMap.scale;
          
          // Create or update zone marker
          if (!this.miniMap.zones[zoneId]) {
            // Create new zone marker
            const zoneDot = this.add.circle(miniX, miniY, miniRadius, this.getZoneColor(zoneData.type), 0.5);
            zoneDot.setStrokeStyle(1, 0xffffff, 0.3);
            zoneDot.setScrollFactor(0);
            
            // Add to container and store reference
            this.miniMapContainer.add(zoneDot);
            this.miniMap.zones[zoneId] = zoneDot;
          } else {
            // Update existing zone marker
            const zoneDot = this.miniMap.zones[zoneId];
            zoneDot.setPosition(miniX, miniY);
            zoneDot.setRadius(miniRadius);
          }
        });
        
        // Remove markers for zones that no longer exist
        Object.keys(this.miniMap.zones).forEach(zoneId => {
          if (!this.entities.zones[zoneId]) {
            this.miniMap.zones[zoneId].destroy();
            delete this.miniMap.zones[zoneId];
          }
        });
      }
    } catch (error) {
      console.error('Error updating mini-map:', error);
    }
  }

  // Helper to get a color for zone types
  getZoneColor(zoneType) {
    const colors = {
      'Hub': 0x9b59b6,
      'Residential': 0x2ecc71,
      'Commercial': 0xe67e22,
      'Cultural': 0x3498db,
      'Industrial': 0xe74c3c,
      'default': 0x95a5a6
    };
    
    return colors[zoneType] || colors.default;
  }

  /**
   * Set up control buttons and input handlers
   */
  setupControls() {
    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Move player with arrow keys
    this.input.keyboard.on('keydown', (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.movePlayer(0, -this.moveStep);
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.movePlayer(0, this.moveStep);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.movePlayer(-this.moveStep, 0);
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.movePlayer(this.moveStep, 0);
          break;
      }
    });
    
    // Zoom with plus/minus keys
    this.input.keyboard.on('keydown', (event) => {
      if (event.code === 'Equal' || event.code === 'NumpadAdd') { // Plus key
        this.zoomMap(0.1);
      } else if (event.code === 'Minus' || event.code === 'NumpadSubtract') { // Minus key
        this.zoomMap(-0.1);
      }
    });
    
    // Mouse wheel zoom
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      const zoomChange = deltaY > 0 ? -0.05 : 0.05;
      this.zoomMap(zoomChange);
    });
    
    // Pan with mouse drag
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && !pointer.wasTouch) {
        this.cameraOffset.x -= pointer.movementX / this.mapScale;
        this.cameraOffset.y -= pointer.movementY / this.mapScale;
        
        // Apply the new offset to the camera
        this.cameras.main.setFollowOffset(-this.cameraOffset.x, -this.cameraOffset.y);
      }
    });
    
    // Connect UI buttons to movement functions
    this.connectUIButtons();
  }

  /**
   * Connect UI buttons to movement functions
   */
  connectUIButtons() {
    try {
      const northBtn = document.getElementById('btn-north');
      const southBtn = document.getElementById('btn-south');
      const eastBtn = document.getElementById('btn-east');
      const westBtn = document.getElementById('btn-west');
      const zoomInBtn = document.getElementById('btn-zoom-in');
      const zoomOutBtn = document.getElementById('btn-zoom-out');
      
      // Set up continuous movement with long press
      if (window.setupLongPress) {
        window.setupLongPress('btn-north', () => this.movePlayer(0, -this.moveStep));
        window.setupLongPress('btn-south', () => this.movePlayer(0, this.moveStep));
        window.setupLongPress('btn-east', () => this.movePlayer(this.moveStep, 0));
        window.setupLongPress('btn-west', () => this.movePlayer(-this.moveStep, 0));
      } else {
        // Fallback for single-press movement
        if (northBtn) northBtn.addEventListener('click', () => this.movePlayer(0, -this.moveStep * 2));
        if (southBtn) southBtn.addEventListener('click', () => this.movePlayer(0, this.moveStep * 2));
        if (eastBtn) eastBtn.addEventListener('click', () => this.movePlayer(this.moveStep * 2, 0));
        if (westBtn) westBtn.addEventListener('click', () => this.movePlayer(-this.moveStep * 2, 0));
      }
      
      // Zoom controls
      if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomMap(0.1));
      if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomMap(-0.1));
      
      console.log('UI buttons connected successfully');
    } catch (error) {
      console.error('Error connecting UI buttons:', error);
    }
  }

  /**
   * Move the player
   * @param {number} dx - Movement in x direction
   * @param {number} dy - Movement in y direction
   */
  movePlayer(dx, dy) {
    if (!this.playerContainer) return;
    
    try {
      // Calculate actual movement with speed factored in
      const actualDx = dx * this.moveSpeed;
      const actualDy = dy * this.moveSpeed;
      
      // Update the player's position in world coordinates
      this.playerPosition.x += actualDx;
      this.playerPosition.y += actualDy;
      
      // Update the container position
      this.updatePlayerPosition();
      
      // Emit movement particles if we have an emitter
      if (this.playerEmitter) {
        // Only emit particles if movement is significant
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          // Emit in the opposite direction of movement
          this.playerEmitter.setPosition(this.playerPosition.x, this.playerPosition.y);
          this.playerEmitter.setSpeed({ min: 10 + Math.abs(dx + dy) * 10, max: 20 + Math.abs(dx + dy) * 15 });
          this.playerEmitter.setScale({ start: 0.2, end: 0 });
          this.playerEmitter.explode(3 + Math.floor(Math.abs(dx + dy) * 3), 
            this.playerPosition.x - (dx * 10), 
            this.playerPosition.y - (dy * 10)
          );
          
          // Create a small trail effect
          this.time.delayedCall(50, () => {
            if (this.playerEmitter) {
              this.playerEmitter.explode(2, 
                this.playerPosition.x - (dx * 20), 
                this.playerPosition.y - (dy * 20)
              );
            }
          });
        }
      }
      
      // If movement is significant, rotate player to face movement direction
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        // Get the direction angle
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Find the direction indicator in the container
        const direction = this.playerContainer.getAt(this.playerContainer.length - 2);
        if (direction) {
          // Smooth rotation to face the movement direction
          this.tweens.add({
            targets: direction,
            angle: angle + 90, // +90 because our triangle points up by default
            duration: 200,
            ease: 'Power1'
          });
        }
      }
      
      // Send position update to server
      network.sendPlayerMovement(this.playerPosition.x, this.playerPosition.y);
      
      // Update UI with new position
      ui.log(`Position: (${Math.round(this.playerPosition.x)}, ${Math.round(this.playerPosition.y)})`);
      
    } catch (error) {
      console.error('Error moving player:', error);
    }
  }

  /**
   * Update the player's position based on the current playerPosition coordinates
   */
  updatePlayerPosition() {
    if (!this.playerContainer) return;
    
    try {
      // Update the container position
      this.playerContainer.setPosition(this.playerPosition.x, this.playerPosition.y);
      
      // Smooth camera follow with slight delay for better feel
      this.cameras.main.pan(
        this.playerPosition.x, 
        this.playerPosition.y,
        300, // Duration in ms
        'Power2' // Easing function
      );
      
      // Update mini-map marker if mini-map exists
      this.updateMiniMap();
      
    } catch (error) {
      console.error('Error updating player position:', error);
    }
  }

  /**
   * Zoom the map
   * @param {number} amount - Amount to zoom (positive = zoom in, negative = zoom out)
   */
  zoomMap(amount) {
    // Calculate new scale
    const newScale = Math.max(0.1, Math.min(2, this.mapScale + amount));
    
    // Only update if the scale has changed
    if (newScale !== this.mapScale) {
      this.mapScale = newScale;
      this.cameras.main.setZoom(this.mapScale);
      
      // Update UI
      ui.log(`Map scale: ${this.mapScale.toFixed(2)}`);
    }
  }

  /**
   * Set up network event handlers
   */
  setupNetworkHandlers() {
    // State change handler
    network.on('onStateChange', (state) => {
      this.handleStateChange(state);
    });
    
    // Power details handler
    network.on('onPowerDetails', (message) => {
      ui.showPowerDetails(message);
    });
  }

  /**
   * Handle state changes from the server
   * @param {Object} state - Current game state
   */
  handleStateChange(state) {
    // Update players
    state.players.forEach((player, sessionId) => {
      this.updatePlayerEntity(sessionId, player);
    });
    
    // Update powers
    state.powers.forEach((power, powerId) => {
      if (power.isActive) {
        this.updatePowerEntity(powerId, power);
      } else {
        this.removePowerEntity(powerId);
      }
    });
    
    // Update zones
    state.zones.forEach((zone, zoneId) => {
      if (zone.isActive) {
        this.updateZoneEntity(zoneId, zone);
      } else {
        this.removeZoneEntity(zoneId);
      }
    });
    
    // Update UI counters
    ui.updatePlayerCount(state.playerCount || state.players.size);
    ui.updatePowerCount(state.activePowerCount || state.powers.size);
  }

  /**
   * Update a player entity
   * @param {string} sessionId - Player session ID
   * @param {Object} playerData - Player data from server
   */
  updatePlayerEntity(sessionId, playerData) {
    const isCurrentPlayer = sessionId === network.getSessionId();
    
    // Skip updating our own player's position from server
    if (isCurrentPlayer) {
      // Update virtue metrics for current player
      ui.updateVirtueMetrics(playerData.virtues);
      return;
    }
    
    let playerSprite = this.entities.players[sessionId];
    
    // Create sprite if it doesn't exist
    if (!playerSprite) {
      playerSprite = this.physics.add.sprite(playerData.position.x, playerData.position.y, 'otherPlayer');
      playerSprite.setDepth(50);
      playerSprite.setScale(1.5);
      
      // Add to entities list
      this.entities.players[sessionId] = playerSprite;
    }
    
    // Update position
    playerSprite.x = playerData.position.x;
    playerSprite.y = playerData.position.y;
  }

  /**
   * Update a power entity
   * @param {string} powerId - Power ID
   * @param {Object} powerData - Power data from server
   */
  updatePowerEntity(powerId, powerData) {
    try {
      console.log(`Updating power entity: ${powerId}`, powerData);
      
      if (!this.entities.powers[powerId]) {
        // Create a new power container
        const powerContainer = this.add.container(powerData.position.x, powerData.position.y);
        powerContainer.setDepth(5);
        
        // Create the power sprite
        const powerSprite = this.add.sprite(0, 0, 'power');
        powerSprite.setScale(0.5);
        
        // Determine color based on power type
        let color = 0xffbe0b; // Default/Justice
        if (powerData.type === 'Wisdom') color = 0x3a86ff;
        else if (powerData.type === 'Courage') color = 0xff006e;
        else if (powerData.type === 'Temperance') color = 0x8ac926;
        
        // Create a glow effect
        const glow = this.add.circle(0, 0, 25, color, 0.3);
        
        // Create a ring
        const ring = this.add.circle(0, 0, 30, 0xffffff, 0);
        ring.setStrokeStyle(2, color, 0.6);
        
        // Add to container in correct order
        powerContainer.add(glow);
        powerContainer.add(powerSprite);
        powerContainer.add(ring);
        
        // Add particle emitter for special effects
        if (this.particles) {
          const particles = this.add.particles(0, 0, 'particle', {
            speed: { min: 20, max: 50 },
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            tint: color,
            frequency: 200 // Lower = more particles
          });
          powerContainer.add(particles);
        }
        
        // Add float animation
        this.tweens.add({
          targets: powerContainer,
          y: powerContainer.y - 10,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        
        // Add pulsing to the glow
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.3, to: 0.6 },
          scale: { from: 1, to: 1.2 },
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        
        // Add rotation to the ring
        this.tweens.add({
          targets: ring,
          angle: 360,
          duration: 15000,
          repeat: -1,
          ease: 'Linear'
        });
        
        // Store reference to the power entity
        this.entities.powers[powerId] = {
          container: powerContainer,
          sprite: powerSprite,
          data: powerData,
          glow: glow,
          ring: ring
        };
        
        // Make clickable
        powerSprite.setInteractive({ useHandCursor: true });
        powerSprite.on('pointerdown', () => {
          console.log('Power clicked:', powerId, powerData);
          // Handle power interaction here
        });
        
      } else {
        // Update existing power
        const power = this.entities.powers[powerId];
        power.container.setPosition(powerData.position.x, powerData.position.y);
        power.data = powerData;
      }
    } catch (error) {
      console.error('Error updating power entity:', error);
    }
  }

  /**
   * Update a zone entity
   * @param {string} zoneId - Zone ID
   * @param {Object} zoneData - Zone data from server
   */
  updateZoneEntity(zoneId, zoneData) {
    try {
      console.log(`Updating zone entity: ${zoneId}`, zoneData);
      
      // Define colors based on zone type
      const zoneColors = {
        'residential': { border: 0x00a000, fill: 0x00a000 },
        'commercial': { border: 0xb8860b, fill: 0xb8860b },
        'education': { border: 0x4682b4, fill: 0x4682b4 },
        'nature': { border: 0x2e8b57, fill: 0x2e8b57 },
        'hub': { border: 0x4b0082, fill: 0x4b0082 },
        'default': { border: 0x008080, fill: 0x008080 }
      };
      
      const colorInfo = zoneColors[zoneData.type] || zoneColors.default;
      
      if (!this.entities.zones[zoneId]) {
        // Create new zone
        const zoneContainer = this.add.container(zoneData.center.x, zoneData.center.y);
        zoneContainer.setDepth(2);
        
        // Create zone circle
        const zoneCircle = this.add.circle(0, 0, zoneData.radius, colorInfo.fill, 0.1);
        zoneCircle.setStrokeStyle(4, colorInfo.border, 0.5);
        
        // Create zone border effect (a slightly larger circle that pulses)
        const zoneBorder = this.add.circle(0, 0, zoneData.radius + 5, colorInfo.border, 0);
        zoneBorder.setStrokeStyle(2, colorInfo.border, 0.3);
        
        // Create zone label
        const zoneLabel = this.add.text(0, 0, zoneData.name, {
          font: '14px Inter',
          fill: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
          align: 'center'
        }).setOrigin(0.5);
        
        // Add to container
        zoneContainer.add(zoneCircle);
        zoneContainer.add(zoneBorder);
        zoneContainer.add(zoneLabel);
        
        // Add pulsing animation to border
        this.tweens.add({
          targets: zoneBorder,
          scaleX: 1.05,
          scaleY: 1.05,
          alpha: { from: 0.3, to: 0.5 },
          duration: 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        
        // Store reference
        this.entities.zones[zoneId] = {
          container: zoneContainer,
          circle: zoneCircle,
          border: zoneBorder,
          label: zoneLabel,
          data: zoneData
        };
        
      } else {
        // Update existing zone
        const zone = this.entities.zones[zoneId];
        zone.container.setPosition(zoneData.center.x, zoneData.center.y);
        
        // Update radius if needed
        if (zone.circle.radius !== zoneData.radius) {
          zone.circle.setRadius(zoneData.radius);
          zone.border.setRadius(zoneData.radius + 5);
        }
        
        // Update label if needed
        if (zone.data.name !== zoneData.name) {
          zone.label.setText(zoneData.name);
        }
        
        zone.data = zoneData;
      }
    } catch (error) {
      console.error('Error updating zone entity:', error);
    }
  }

  /**
   * Remove a player entity
   * @param {string} sessionId - Player session ID
   */
  removePlayerEntity(sessionId) {
    const playerSprite = this.entities.players[sessionId];
    if (playerSprite) {
      playerSprite.destroy();
      delete this.entities.players[sessionId];
    }
  }

  /**
   * Remove a power entity
   * @param {string} powerId - Power ID
   */
  removePowerEntity(powerId) {
    const powerSprite = this.entities.powers[powerId];
    if (powerSprite) {
      powerSprite.destroy();
      delete this.entities.powers[powerId];
    }
  }

  /**
   * Remove a zone entity
   * @param {string} zoneId - Zone ID
   */
  removeZoneEntity(zoneId) {
    const zoneSprite = this.entities.zones[zoneId];
    if (zoneSprite) {
      // Remove label if it exists
      if (zoneSprite.label) {
        zoneSprite.label.destroy();
      }
      
      zoneSprite.destroy();
      delete this.entities.zones[zoneId];
    }
  }

  // Initialize touch controls
  initTouchControls() {
    try {
      // Make the setupLongPress function globally available
      window.setupLongPress = (buttonId, moveFunction) => {
        let interval;
        let isHolding = false;
        const button = document.getElementById(buttonId);
        
        if (!button) return;
        
        const startMove = (e) => {
          if (e) e.preventDefault();
          isHolding = true;
          moveFunction();
          interval = setInterval(() => {
            if (isHolding) moveFunction();
          }, 100);
        };
        
        const stopMove = () => {
          isHolding = false;
          clearInterval(interval);
        };
        
        button.addEventListener('mousedown', startMove);
        button.addEventListener('touchstart', startMove, { passive: false });
        
        // Global event listeners to handle releasing outside the button
        document.addEventListener('mouseup', stopMove);
        document.addEventListener('touchend', stopMove);
        
        // Prevent context menu on long press (mobile)
        button.addEventListener('contextmenu', (e) => e.preventDefault());
      };
      
      console.log('Long press controls initialized');
    } catch (error) {
      console.error('Error initializing touch controls:', error);
    }
  }
} 