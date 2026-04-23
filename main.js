/* Astronaut Luna Moon - Refined Version

class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image("bg", "background.png");
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "bg").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.5);

    this.add.text(width / 2, height * 0.2, "Astronaut Luna Moon", {
      fontSize: "48px", color: "#ffffff", stroke: "#000", strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45,
      "ARROWS = Move | SPACE = Jump\nCollect all stars!\nAvoid aliens and bottom spikes.",
      { fontSize: "22px", color: "#ffe680", align: "center", lineSpacing: 10 }
    ).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, height * 0.7, 240, 70, 0x8b5cf6).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.7, "START GAME", { fontSize: "28px", color: "#fff" }).setOrigin(0.5);

    btn.on("pointerdown", () => this.scene.start("MainScene", { score: 0, lives: 3 }));
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  init(data) {
    this.score = data.score || 0;
    this.lives = data.lives || 3;
    this.isInvincible = false;
    this.gameOver = false;
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image("bg", "background.png");
    this.load.image("player", "astronaut.png");
    this.load.image("alien1", "alien1.png");
    this.load.image("alien2", "alien2.png");
    this.load.image("platform", "platform.png");
    this.load.image("spikes", "spikes.png");
    this.load.image("star1", "star1.png");
    this.load.image("star2", "star2.png");
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "bg").setDisplaySize(width, height).setScrollFactor(0);

    // GROUPS
    this.platforms = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.group();

    this.buildLevel();

    // PLAYER - Small scale to fit platforms
    this.player = this.physics.add.sprite(100, 400, "player").setScale(0.12);
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(1000); // Helps with tight landing

    // ENEMIES
    this.runner = this.physics.add.sprite(500, 200, "alien1").setScale(0.14).setBounce(1, 0).setVelocityX(120);
    this.flyer = this.physics.add.sprite(300, 150, "alien2").setScale(0.14);
    this.flyer.body.allowGravity = false;
    this.flyer.startY = 150;
    this.flyer.setVelocityX(80);

    // UI
    this.scoreText = this.add.text(20, 20, `Stars: ${this.score}`, { fontSize: '24px', fill: '#fff', stroke: '#000', strokeThickness: 4 });
    this.livesText = this.add.text(20, 55, `Lives: ${this.lives}`, { fontSize: '24px', fill: '#ff4d4d', stroke: '#000', strokeThickness: 4 });

    // CONTROLS
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // PHYSICS
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.runner, this.platforms);
    this.physics.add.collider(this.collectibles, this.platforms);
    
    this.physics.add.overlap(this.player, this.collectibles, this.collectStar, null, this);
    this.physics.add.overlap(this.player, [this.runner, this.flyer, this.spikes, this.hazards], this.hitPlayer, null, this);

    this.spawnFallingHazards();
  }

  buildLevel() {
    // Ground platforms (elevated slightly above spikes)
    this.platforms.create(150, 540, "platform").setScale(0.5).refreshBody();
    this.platforms.create(400, 540, "platform").setScale(0.5).refreshBody();
    this.platforms.create(650, 540, "platform").setScale(0.5).refreshBody();

    // Floating platforms for stars
    const platPositions = [
      { x: 170, y: 400 }, { x: 330, y: 300 },
      { x: 500, y: 220 }, { x: 670, y: 350 }, { x: 400, y: 120 }
    ];

    platPositions.forEach(pos => {
      this.platforms.create(pos.x, pos.y, "platform").setScale(0.4).refreshBody();
      // Add a star on each platform
      const star = this.collectibles.create(pos.x, pos.y - 40, pos.x % 2 === 0 ? "star1" : "star2");
      star.setScale(0.06).setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    // SPIKES AT THE BOTTOM
    // We place them along the very bottom edge (y=585)
    for (let i = 25; i <= 800; i += 50) {
      this.spikes.create(i, 585, "spikes").setScale(0.15).refreshBody();
    }
  }

  spawnFallingHazards() {
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        if (this.gameOver) return;
        const h = this.hazards.create(Phaser.Math.Between(50, 750), -50, "star2");
        h.setScale(0.04).setTint(0xff0000).setVelocityY(250);
      }
    });
  }

  collectStar(player, star) {
    star.destroy();
    this.score += 10;
    this.scoreText.setText(`Stars: ${this.score}`);
    
    // Check for win condition
    if (this.collectibles.countActive(true) === 0) {
      this.add.text(400, 300, "YOU WIN!\nNext Level...", { fontSize: "40px", align: "center" }).setOrigin(0.5);
      this.time.delayedCall(2000, () => this.scene.restart({ score: this.score, lives: this.lives }));
    }
  }

  hitPlayer() {
    if (this.isInvincible || this.gameOver) return;

    this.lives--;
    this.livesText.setText(`Lives: ${this.lives}`);
    this.isInvincible = true;
    this.player.setTint(0xff0000);

    // Knockback
    this.player.setVelocityY(-300);
    this.player.setVelocityX(this.player.x < 400 ? 200 : -200);

    if (this.lives <= 0) {
      this.gameOver = true;
      this.physics.pause();
      this.add.text(400, 300, "GAME OVER\nClick to Try Again", { fontSize: "40px", align: "center" }).setOrigin(0.5);
      this.input.once("pointerdown", () => this.scene.start("StartScene"));
    } else {
      this.time.delayedCall(1000, () => {
        this.player.clearTint();
        this.isInvincible = false;
      });
    }
  }

  update(time) {
    if (this.gameOver) return;

    // Movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-260);
      this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(260);
      this.player.flipX = false;
    }

    // Spacebar Jump
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.player.body.blocked.down) {
      this.player.setVelocityY(-480);
    }

    // Alien AI
    if (this.runner.body.blocked.left || this.runner.body.blocked.right) {
      this.runner.setVelocityX(-this.runner.body.velocity.x);
    }
    
    this.flyer.y = this.flyer.startY + Math.sin(time / 400) * 50;
    if (this.flyer.x <= 50 || this.flyer.x >= 750) {
      this.flyer.setVelocityX(-this.flyer.body.velocity.x);
      this.flyer.flipX = this.flyer.body.velocity.x > 0;
    }

    // Cleanup hazards
    this.hazards.children.each(h => { if (h.y > 600) h.destroy(); });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  backgroundColor: "#0b0620",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 800 }, debug: false }
  },
  scene: [StartScene, MainScene]
};

new Phaser.Game(config);
