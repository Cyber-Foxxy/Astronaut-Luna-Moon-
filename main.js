// main.js
// Implemented features 
// - Spacebar jump
// - star gravity change
// - Individual star gravity per star
// - player sprite 
// - Spikes hazard
// - Start menu 
// - Timer 
// - Different collectible values (big/small stars)

class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  preload() {
    this.load.image("bg", "assets/background.png");
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "bg").setScale(1.2);
    this.add.rectangle(width / 2, height / 2, 560, 260, 0x000000, 0.55).setStrokeStyle(4, 0x8b5cf6);
    this.add.text(width / 2, height / 2 - 40, "Astronaut Luna Moon", { fontSize: "36px", fill: "#fff" }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 10, "Press ENTER to Start", { fontSize: "20px", fill: "#fff" }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 50, "Move: ← →   Jump: SPACE", { fontSize: "16px", fill: "#ddd" }).setOrigin(0.5);

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start("MainScene", { level: 1, lives: 5 });
    }
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.level = 1;
    this.lives = 5;
  }

  preload() {
    // All assets are PNGs in assets/ folder
    this.load.image("bg", "assets/background.png");
    this.load.image("platform", "assets/floating_island.png");
    this.load.image("star", "assets/star_happy.png");
    this.load.image("spike", "assets/spike.png");
    // Use images for player and enemy to avoid spritesheet frame mismatch issues
    this.load.image("playerImg", "assets/astronaut.png");
    this.load.image("enemyImg", "assets/jetray.png");
  }

  create(data) {
    if (data && data.level) this.level = data.level;
    if (data && data.lives) this.lives = data.lives;

    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "bg").setScale(1.2);

    // Adjust world gravity for global star feel (feature 2)
    // Base gravity increases slightly with level to make later levels heavier
    this.physics.world.gravity.y = 350 + (this.level - 1) * 20;

    // Platforms (feature 8)
    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(width / 2, height - 40, "platform").setScale(3).refreshBody();
    this.platforms.create(200, 420, "platform").setScale(0.9).refreshBody();
    this.platforms.create(600, 320, "platform").setScale(0.9).refreshBody();
    this.platforms.create(400, 220, "platform").setScale(0.8).refreshBody();
    this.platforms.create(100, 260, "platform").setScale(0.7).refreshBody();
    this.platforms.create(700, 200, "platform").setScale(0.7).refreshBody();

    // Player (feature 4: different player sprite)
    this.player = this.physics.add.sprite(100, 450, "playerImg").setScale(0.6);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);

    // Enemy (simple image sprite, patrols)
    this.enemy = this.physics.add.sprite(600, 450, "enemyImg").setScale(0.6);
    this.enemy.setCollideWorldBounds(true);
    this.enemy.setVelocityX(80 + (this.level - 1) * 20);
    this.enemy.setBounce(1, 0);

    // Stars group (collectibles)
    this.stars = this.physics.add.group();
    this.spawnStarsForLevel(this.level);

    // Spikes hazards (feature 5)
    this.spikes = this.physics.add.staticGroup();
    const spikeSpacing = width / 6;
    for (let i = 1; i <= 5; i++) {
      const spike = this.spikes.create(i * spikeSpacing, height - 60, "spike").setScale(0.5).refreshBody();
      spike.setOrigin(0.5, 1);
    }

    // UI
    this.score = 0;
    this.scoreText = this.add.text(20, 20, "Score: 0", { fontSize: "24px", fill: "#fff" });
    this.livesText = this.add.text(20, 50, "Lives: " + this.lives, { fontSize: "24px", fill: "#fff" });
    this.levelText = this.add.text(20, 80, "Level: " + this.level, { fontSize: "20px", fill: "#fff" });

    // Timer (feature 6)
    this.levelStartTime = this.time.now;
    this.timerText = this.add.text(600, 20, "Time: 0.0s", { fontSize: "20px", fill: "#fff" });

    // Input (feature 1: spacebar jump)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemy, this.platforms);
    this.physics.add.collider(this.stars, this.platforms);

    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.collider(this.player, this.spikes, this.hitHazard, null, this);
    this.physics.add.collider(this.player, this.enemy, this.hitHazard, null, this);

    // Enemy world bounds bounce handler (reverse direction)
    this.enemy.body.onWorldBounds = true;
    this.enemy.body.world.on('worldbounds', (body) => {
      if (body.gameObject === this.enemy) {
        this.enemy.setVelocityX(-this.enemy.body.velocity.x);
        this.enemy.flipX = !this.enemy.flipX;
      }
    });

    // small cooldown to avoid multiple life losses in quick succession
    this.lastHitTime = 0;
  }

  update(time) {
    const speed = 220;

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    // Spacebar jump only when touching ground (feature 1)
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.player.body.touching.down) {
      this.player.setVelocityY(-380);
    }

    // Enemy simple patrol bounds
    if (this.enemy.x > 750) {
      this.enemy.setVelocityX(-80 - (this.level - 1) * 20);
      this.enemy.setFlipX(true);
    } else if (this.enemy.x < 450) {
      this.enemy.setVelocityX(80 + (this.level - 1) * 20);
      this.enemy.setFlipX(false);
    }

    // Update timer display
    const elapsed = (time - this.levelStartTime) / 1000;
    this.timerText.setText("Time: " + elapsed.toFixed(1) + "s");
  }

  collectStar(player, star) {
    // Different collectible values (feature 7)
    let value = 10;
    if (star.getData('big')) value = 25;

    star.disableBody(true, true);
    this.score += value;
    this.scoreText.setText("Score: " + this.score);

    // If all stars collected, advance level (feature 9)
    if (this.stars.countActive(true) === 0) {
      const levelTime = (this.time.now - this.levelStartTime) / 1000;
      // stop timer visually by freezing the displayed time for a moment
      this.time.delayedCall(600, () => {
        this.level++;
        this.levelText.setText("Level: " + this.level);
        // increase difficulty: faster enemy and slightly stronger gravity
        this.enemy.setVelocityX((this.enemy.body.velocity.x > 0 ? 1 : -1) * (80 + (this.level - 1) * 20));
        // respawn stars for next level
        this.spawnStarsForLevel(this.level);
        // reset timer
        this.levelStartTime = this.time.now;
      });
    }
  }

  hitHazard(player, hazard) {
    const now = this.time.now;
    if (now - this.lastHitTime < 800) return;
    this.lastHitTime = now;

    this.lives--;
    this.livesText.setText("Lives: " + this.lives);
    this.player.setTint(0xff0000);
    this.player.setVelocityY(-200); // knockback

    this.time.delayedCall(500, () => {
      this.player.clearTint();
      if (this.lives <= 0) {
        // go back to menu and reset
        this.scene.start("MenuScene");
      } else {
        // respawn player to safe spot
        this.player.setPosition(100, 450);
      }
    });
  }

  spawnStarsForLevel(level) {
    // Clear existing stars
    if (this.stars) {
      this.stars.clear(true, true);
    }

    // Base positions and extra positions for higher levels (feature 8)
    const basePositions = [
      { x: 200, y: 350 },
      { x: 600, y: 250 },
      { x: 400, y: 150 }
    ];

    const extra = Math.min(level - 1, 6);
    for (let i = 0; i < extra; i++) {
      basePositions.push({ x: 80 + i * 110, y: 120 + (i % 3) * 60 });
    }

    // Create stars with individual gravity (feature 3) and occasional big star (feature 7)
    basePositions.forEach((pos) => {
      const star = this.stars.create(pos.x, pos.y, "star");
      const isBig = Math.random() < 0.25;
      star.setScale(isBig ? 0.9 : 0.5);
      star.setData('big', isBig);

      // Individual gravity per star (randomized)
      const gravityY = Phaser.Math.Between(80 + level * 5, 220 + level * 10);
      // ensure body exists before setting gravity
      star.body.setGravityY(gravityY);

      star.setBounce(0.4 + Math.random() * 0.4);
      star.setCollideWorldBounds(true);
    });

    // Global tweak for star gravity based on level (feature 2)
    this.stars.children.iterate((s) => {
      if (s && s.body) {
        s.body.setGravityY(s.body.gravity.y * (1 + (level - 1) * 0.04));
      }
    });
  }
}

// Game config
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 350 }, debug: false }
  },
  scene: [MenuScene, MainScene]
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});


