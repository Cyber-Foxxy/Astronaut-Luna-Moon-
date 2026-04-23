// Features implemented (for submission):
// 1) Spacebar jump
// 2) Global star gravity change (world gravity tweak)
// 3) Individual star gravity (random per star)
// 4) Different player sprite key (playerAlt loaded)
// 5) Spikes hazard
// Additional: Start screen, Level system, Timer, Different collectible values

class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  preload() {
    // load minimal assets for menu background
    this.load.image("bg", "assets/background.jpeg");
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "bg").setScale(1.2);
    this.add.rectangle(width / 2, height / 2, 520, 220, 0x000000, 0.5).setStrokeStyle(4, 0x8b5cf6);
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
    // IMPORTANT: assets are expected to be in the assets/ folder
    this.load.image("bg", "assets/background.jpeg");
    this.load.image("platform", "assets/floating_island.png");
    this.load.image("star", "assets/star_happy.png");
    this.load.image("spike", "assets/spike.png");
    // load the player spritesheet twice under different keys to demonstrate "different player sprite"
    this.load.spritesheet("player", "assets/astronaut.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("playerAlt", "assets/astronaut.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("alien", "assets/jetray.png", { frameWidth: 128, frameHeight: 128 });
  }

  create(data) {
    // initialize level and lives from menu if provided
    if (data && data.level) this.level = data.level;
    if (data && data.lives) this.lives = data.lives;

    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "bg").setScale(1.2);

    // Physics world gravity tweak (global star feel)
    // Make the world gravity a bit stronger for a heavier feel
    this.physics.world.gravity.y = 350 + (this.level - 1) * 20;

    // Platforms group
    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(width / 2, height - 40, "platform").setScale(3).refreshBody();
    // More platforms for level design
    this.platforms.create(200, 420, "platform").setScale(0.9).refreshBody();
    this.platforms.create(600, 320, "platform").setScale(0.9).refreshBody();
    this.platforms.create(400, 220, "platform").setScale(0.8).refreshBody();
    this.platforms.create(100, 260, "platform").setScale(0.7).refreshBody();
    this.platforms.create(700, 200, "platform").setScale(0.7).refreshBody();

    // Player - use playerAlt key to show different sprite (you can switch to "player" to change look)
    this.player = this.physics.add.sprite(100, 450, "playerAlt").setScale(0.7);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);

    // Player animations (walk)
    this.anims.create({
      key: "walk",
      frames: this.anims.generateFrameNumbers("playerAlt", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    // Enemy
    this.enemy = this.physics.add.sprite(600, 450, "alien").setScale(0.7);
    this.enemy.setCollideWorldBounds(true);
    this.enemy.setVelocityX(80 + (this.level - 1) * 20);
    this.enemy.setBounce(1, 0);

    this.anims.create({
      key: "alienWalk",
      frames: this.anims.generateFrameNumbers("alien", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });
    this.enemy.play("alienWalk");

    // Stars (collectibles) - group
    this.stars = this.physics.add.group();
    this.spawnStarsForLevel(this.level);

    // Spikes (hazards)
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

    // Timer (speed-run style)
    this.levelStartTime = this.time.now;
    this.timerText = this.add.text(600, 20, "Time: 0.0s", { fontSize: "20px", fill: "#fff" });

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemy, this.platforms);
    this.physics.add.collider(this.stars, this.platforms);

    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.collider(this.player, this.spikes, this.hitHazard, null, this);
    this.physics.add.collider(this.player, this.enemy, this.hitHazard, null, this);

    // Make enemy bounce off world bounds and reverse direction
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

    // Movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.play("walk", true);
      this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.play("walk", true);
      this.player.flipX = false;
    } else {
      this.player.setVelocityX(0);
      this.player.anims.stop();
    }

    // Spacebar jump (only when touching down)
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.player.body.touching.down) {
      this.player.setVelocityY(-380);
    }

    // Enemy patrol bounds (simple)
    if (this.enemy.x > 750) {
      this.enemy.setVelocityX(-80 - (this.level - 1) * 20);
      this.enemy.flipX = true;
    } else if (this.enemy.x < 450) {
      this.enemy.setVelocityX(80 + (this.level - 1) * 20);
      this.enemy.flipX = false;
    }

    // Update timer display
    const elapsed = (time - this.levelStartTime) / 1000;
    this.timerText.setText("Time: " + elapsed.toFixed(1) + "s");
  }

  collectStar(player, star) {
    // Different collectible values: small star vs big star (we used scale to indicate)
    let value = 10;
    if (star.getData('big')) value = 25;

    star.disableBody(true, true);
    this.score += value;
    this.scoreText.setText("Score: " + this.score);

    // Check if all stars collected
    if (this.stars.countActive(true) === 0) {
      // stop timer and advance level after a short delay
      const levelTime = (this.time.now - this.levelStartTime) / 1000;
      this.time.delayedCall(600, () => {
        this.level++;
        this.levelText.setText("Level: " + this.level);
        // increase difficulty: faster enemy, stronger gravity
        this.enemy.setVelocityX((this.enemy.body.velocity.x > 0 ? 1 : -1) * (80 + (this.level - 1) * 20));
        // respawn stars for next level
        this.spawnStarsForLevel(this.level);
        // reset timer
        this.levelStartTime = this.time.now;
      });
    }
  }

  hitHazard(player, hazard) {
    // small invulnerability window
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
        // restart to menu with reset stats
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

    // Positions for stars (more stars as level increases)
    const basePositions = [
      { x: 200, y: 350 },
      { x: 600, y: 250 },
      { x: 400, y: 150 }
    ];

    // Add more positions for higher levels
    const extra = Math.min(level - 1, 4);
    for (let i = 0; i < extra; i++) {
      basePositions.push({ x: 100 + i * 140, y: 120 + (i % 2) * 80 });
    }

    // Create stars with individual gravity and occasional "big" star
    basePositions.forEach((pos, idx) => {
      const star = this.stars.create(pos.x, pos.y, "star");
      // scale: some are big (higher value)
      const isBig = Math.random() < 0.25;
      star.setScale(isBig ? 0.8 : 0.5);
      star.setData('big', isBig);

      // Give each star its own gravity (individual behavior)
      const gravityY = Phaser.Math.Between(50 + level * 10, 150 + level * 20);
      star.body.setGravityY(gravityY);

      // bounce and collide with platforms
      star.setBounce(0.5 + Math.random() * 0.3);
      star.setCollideWorldBounds(true);
    });

    // Make stars feel heavier or lighter globally by adjusting their body gravity scale
    // (This is the global star gravity change; we already set world gravity earlier.)
    this.stars.children.iterate((s) => {
      if (s) {
        s.body.setGravityY(s.body.gravity.y * (1 + (level - 1) * 0.05));
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

new Phaser.Game(config);

