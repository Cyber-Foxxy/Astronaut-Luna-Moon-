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

    const bg = this.add.image(width / 2, height / 2, "bg");
    bg.setDisplaySize(width, height);

    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.4);

    this.add.text(width / 2, 100, "Astronaut Luna Moon", {
      fontSize: "42px",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 250,
      "Arrow Keys = Move\nSpacebar = Jump\nCollect stars, avoid enemies!",
      {
        fontSize: "24px",
        color: "#ffe680",
        align: "center"
      }
    ).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, 430, 240, 70, 0x8b5cf6)
      .setInteractive();

    this.add.text(width / 2, 430, "START GAME", {
      fontSize: "28px",
      color: "#fff"
    }).setOrigin(0.5);

    btn.on("pointerdown", () => {
      this.scene.start("MainScene", { score: 0, lives: 3, level: 1 });
    });
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  init(data) {
    this.score = data.score;
    this.lives = data.lives;
    this.level = data.level;
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

    this.add.image(width / 2, height / 2, "bg").setDisplaySize(width, height);

    this.platforms = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.group();

    this.buildPlatforms();
    this.buildSpikes();

    // PLAYER
    this.player = this.physics.add.sprite(100, 450, "player");
    this.player.setScale(0.11);
    this.player.setCollideWorldBounds(true);

    // ENEMIES
    this.runner = this.physics.add.sprite(500, 250, "alien1");
    this.runner.setScale(0.14);
    this.runner.setVelocityX(100);
    this.runner.setBounce(1, 0);

    this.flyer = this.physics.add.sprite(300, 150, "alien2");
    this.flyer.setScale(0.14);
    this.flyer.body.allowGravity = false;
    this.flyer.startY = this.flyer.y;
    this.flyer.setVelocityX(70);

    this.createCollectibles();
    this.spawnHazards();

    // UI
    this.scoreText = this.add.text(10, 10, "Score: " + this.score);
    this.livesText = this.add.text(10, 40, "Lives: " + this.lives);

    // INPUT
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // COLLISIONS
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.runner, this.platforms);
    this.physics.add.collider(this.collectibles, this.platforms);

    this.physics.add.overlap(this.player, this.collectibles, this.collectStar, null, this);
    this.physics.add.overlap(this.player, this.runner, this.hitPlayer, null, this);
    this.physics.add.overlap(this.player, this.flyer, this.hitPlayer, null, this);
    this.physics.add.overlap(this.player, this.spikes, this.hitPlayer, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitPlayer, null, this);
  }

  buildPlatforms() {
    const data = [
      { x: 400, y: 520, s: 1.1 },
      { x: 170, y: 440 },
      { x: 330, y: 370 },
      { x: 500, y: 300 },
      { x: 670, y: 240 }
    ];

    data.forEach(p => {
      const plat = this.platforms.create(p.x, p.y, "platform");
      plat.setScale(p.s || 0.5);
      plat.refreshBody();
    });
  }

  buildSpikes() {
    for (let i = 100; i <= 700; i += 120) {
      const spike = this.spikes.create(i, 490, "spikes");
      spike.setScale(0.12);
      spike.refreshBody();
    }
  }

  createCollectibles() {
    const items = [
      { x: 170, y: 390, key: "star1", value: 10 },
      { x: 330, y: 320, key: "star1", value: 10 },
      { x: 500, y: 250, key: "star1", value: 15 },
      { x: 670, y: 190, key: "star1", value: 15 },
      { x: 220, y: 200, key: "star2", value: 25 },
      { x: 600, y: 200, key: "star2", value: 30 }
    ];

    items.forEach(i => {
      const star = this.collectibles.create(i.x, i.y, i.key);
      star.setScale(i.key === "star1" ? 0.08 : 0.045);
      star.body.setGravityY(30);
      star.value = i.value;
    });
  }

  spawnHazards() {
    this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => {
        const h = this.hazards.create(
          Phaser.Math.Between(50, 750),
          -50,
          "star2"
        );
        h.setScale(0.04);
        h.setVelocityY(200);
      }
    });
  }

  collectStar(player, star) {
    this.score += star.value;
    this.scoreText.setText("Score: " + this.score);
    star.destroy();
  }

  hitPlayer() {
    if (this.isInvincible || this.gameOver) return;

    this.lives--;
    this.livesText.setText("Lives: " + this.lives);

    this.isInvincible = true;
    this.player.setTint(0xff0000);

    this.time.delayedCall(1000, () => {
      this.player.clearTint();
      this.isInvincible = false;
    });

    if (this.lives <= 0) {
      this.gameOver = true;
      this.physics.pause();

      this.add.text(400, 300, "GAME OVER\nClick to Restart", {
        fontSize: "32px",
        align: "center"
      }).setOrigin(0.5);

      this.input.once("pointerdown", () => {
        this.scene.restart({ score: 0, lives: 3, level: 1 });
      });
    }
  }

  update(time) {
    if (this.gameOver) return;

    const speed = 300;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
      this.player.body.blocked.down
    ) {
      this.player.setVelocityY(-470);
    }

    // Runner respawn
    if (this.runner.y > 650) {
      this.runner.setPosition(Phaser.Math.Between(100, 700), -50);
    }

    // Flyer movement
    this.flyer.y = this.flyer.startY + Math.sin(time / 300) * 20;

    if (this.flyer.x <= 100 || this.flyer.x >= 700) {
      this.flyer.setVelocityX(-this.flyer.body.velocity.x);
    }

    // Reset falling hazards
    this.hazards.children.each(h => {
      if (h.y > 650) {
        h.y = -50;
        h.x = Phaser.Math.Between(50, 750);
      }
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 500 }
    }
  },
  scene: [StartScene, MainScene]
};

new Phaser.Game(config);
