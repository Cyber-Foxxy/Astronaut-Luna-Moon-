class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.level = 1;
    this.score = 0;
    this.timeElapsed = 0;
    this.bestTime = localStorage.getItem("spaceBestTime") || null;
  }

  preload() {
    // Background
    this.load.image("bg", "background.jpg");

    // Astronaut sheet: 1920 x 960 = 4 cols x 2 rows
    this.load.spritesheet("player", "astronaught.jpg", {
      frameWidth: 480,
      frameHeight: 480
    });

    // Using alien image as a single sprite instead of a sheet
    this.load.image("alien", "alien.jpg");

    // Hazard sheet used as image
    this.load.image("spike", "spike.png");

    // Collectible art
    this.load.image("starsheet", "stars.png");
  }

  create() {
    const { width, height } = this.scale;

    this.timeElapsed = 0;
    this.levelComplete = false;

    // Background
    this.bg = this.add.image(width / 2, height / 2, "bg");
    this.bg.setDisplaySize(width, height);

    // Create platform texture with graphics since no platform.png exists
    this.createPlatformTexture();

    // Platforms
    this.platforms = this.physics.add.staticGroup();
    this.buildLevelPlatforms();

    // Player
    this.player = this.physics.add.sprite(100, 500, "player", 0);
    this.player.setScale(0.23);
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(220, 300);
    this.player.body.setOffset(130, 120);

    // Simple astronaut animation using the first 4 frames
    if (!this.anims.exists("walk")) {
      this.anims.create({
        key: "walk",
        frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }

    // Enemy
    this.enemy = this.physics.add.sprite(620, 450, "alien");
    this.enemy.setScale(0.16);
    this.enemy.setBounce(1, 0);
    this.enemy.setCollideWorldBounds(true);
    this.enemy.setVelocityX(100 + this.level * 20);
    this.enemy.body.setSize(this.enemy.width * 0.5, this.enemy.height * 0.7, true);

    // Collectibles
    this.stars = this.physics.add.group();
    this.gems = this.physics.add.group();

    this.spawnCollectibles();

    // Hazards
    this.spikes = this.physics.add.staticGroup();
    this.createSpikeHazards();

    // UI
    this.scoreText = this.add.text(20, 20, "Score: 0", {
      fontSize: "24px",
      color: "#ffffff"
    }).setScrollFactor(0);

    this.levelText = this.add.text(20, 50, "Level: 1", {
      fontSize: "24px",
      color: "#ffffff"
    }).setScrollFactor(0);

    this.timerText = this.add.text(20, 80, "Time: 0.0", {
      fontSize: "24px",
      color: "#ffffff"
    }).setScrollFactor(0);

    this.bestTimeText = this.add.text(
      20,
      110,
      this.bestTime ? `Best: ${Number(this.bestTime).toFixed(1)}s` : "Best: --",
      {
        fontSize: "24px",
        color: "#ffffff"
      }
    ).setScrollFactor(0);

    this.messageText = this.add.text(width / 2, 40, "", {
      fontSize: "28px",
      color: "#ffff66",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5, 0);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Colliders
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemy, this.platforms);
    this.physics.add.collider(this.stars, this.platforms);
    this.physics.add.collider(this.gems, this.platforms);

    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.overlap(this.player, this.gems, this.collectGem, null, this);

    this.physics.add.collider(this.player, this.spikes, this.hitHazard, null, this);
    this.physics.add.collider(this.player, this.enemy, this.hitHazard, null, this);
  }

  createPlatformTexture() {
    if (this.textures.exists("platform")) return;

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x8b5cf6, 1);
    g.fillRoundedRect(0, 0, 180, 28, 10);
    g.lineStyle(4, 0xd8b4fe, 1);
    g.strokeRoundedRect(0, 0, 180, 28, 10);
    g.generateTexture("platform", 180, 28);
    g.destroy();
  }

  buildLevelPlatforms() {
    const layouts = [
      [
        { x: 400, y: 580, scale: 5 },
        { x: 180, y: 460, scale: 1.3 },
        { x: 420, y: 370, scale: 1.3 },
        { x: 680, y: 290, scale: 1.3 },
        { x: 600, y: 500, scale: 1.1 }
      ],
      [
        { x: 400, y: 580, scale: 5 },
        { x: 150, y: 500, scale: 1.1 },
        { x: 320, y: 410, scale: 1.1 },
        { x: 520, y: 330, scale: 1.1 },
        { x: 700, y: 250, scale: 1.1 },
        { x: 600, y: 470, scale: 1.0 }
      ],
      [
        { x: 400, y: 580, scale: 5 },
        { x: 120, y: 510, scale: 1.0 },
        { x: 270, y: 430, scale: 1.0 },
        { x: 440, y: 350, scale: 1.0 },
        { x: 610, y: 270, scale: 1.0 },
        { x: 760, y: 190, scale: 1.0 },
        { x: 560, y: 470, scale: 1.0 }
      ]
    ];

    const layout = layouts[(this.level - 1) % layouts.length];

    layout.forEach((p) => {
      this.platforms.create(p.x, p.y, "platform").setScale(p.scale, 1).refreshBody();
    });
  }

  spawnCollectibles() {
    const { width } = this.scale;

    // Yellow stars = 10 points
    for (let i = 0; i < 6; i++) {
      const star = this.stars.create(
        Phaser.Math.Between(60, width - 60),
        Phaser.Math.Between(0, 150),
        "starsheet"
      );

      star.setScale(0.045);
      star.setBounce(0.4);
      star.body.setGravityY(Phaser.Math.Between(50, 220)); // individual gravity
      star.value = 10;
    }

    // Blue/purple "planet gems" = 25 points
    for (let i = 0; i < 2; i++) {
      const gem = this.gems.create(
        Phaser.Math.Between(80, width - 80),
        Phaser.Math.Between(0, 120),
        "starsheet"
      );

      gem.setScale(0.03);
      gem.setTint(0x99ccff);
      gem.setBounce(0.6);
      gem.body.setGravityY(Phaser.Math.Between(80, 180)); // individual gravity
      gem.value = 25;
    }
  }

  createSpikeHazards() {
    const spikePositions = [
      { x: 250, y: 560 },
      { x: 500, y: 560 },
      { x: 740, y: 560 }
    ];

    spikePositions.forEach((pos) => {
      const spike = this.spikes.create(pos.x, pos.y, "spike");
      spike.setScale(0.15);
      spike.refreshBody();
    });
  }

  collectStar(player, star) {
    star.disableBody(true, true);
    this.score += star.value;
    this.scoreText.setText("Score: " + this.score);
    this.checkLevelComplete();
  }

  collectGem(player, gem) {
    gem.disableBody(true, true);
    this.score += gem.value;
    this.scoreText.setText("Score: " + this.score);
    this.checkLevelComplete();
  }

  checkLevelComplete() {
    if (
      this.stars.countActive(true) === 0 &&
      this.gems.countActive(true) === 0 &&
      !this.levelComplete
    ) {
      this.levelComplete = true;

      const finalTime = this.timeElapsed;

      if (!this.bestTime || finalTime < Number(this.bestTime)) {
        localStorage.setItem("spaceBestTime", finalTime);
        this.bestTime = finalTime;
      }

      this.messageText.setText("Level Complete!");
      this.bestTimeText.setText(`Best: ${Number(this.bestTime).toFixed(1)}s`);

      this.time.delayedCall(1200, () => {
        this.nextLevel();
      });
    }
  }

  hitHazard() {
    this.player.setTint(0xff0000);
    this.player.setVelocity(0, 0);
    this.physics.pause();

    this.messageText.setText("You got hit!");

    this.time.delayedCall(700, () => {
      this.physics.resume();
      this.player.clearTint();
      this.scene.restart({ level: this.level, score: this.score });
    });
  }

  nextLevel() {
    this.level++;
    this.scene.restart({ level: this.level, score: this.score });
  }

  init(data) {
    if (data.level) this.level = data.level;
    if (typeof data.score === "number") this.score = data.score;
  }

  update(time, delta) {
    if (!this.levelComplete) {
      this.timeElapsed += delta / 1000;
      this.timerText.setText("Time: " + this.timeElapsed.toFixed(1));
    }

    const moveSpeed = 220;

    // Enemy patrol
    if (this.enemy.body.blocked.left) {
      this.enemy.setVelocityX(120 + this.level * 20);
    } else if (this.enemy.body.blocked.right) {
      this.enemy.setVelocityX(-(120 + this.level * 20));
    }

    // Player movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-moveSpeed);
      this.player.play("walk", true);
      this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(moveSpeed);
      this.player.play("walk", true);
      this.player.flipX = false;
    } else {
      this.player.setVelocityX(0);
      this.player.anims.stop();
      this.player.setFrame(0);
    }

    // Spacebar jump only
    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
      this.player.body.blocked.down
    ) {
      this.player.setVelocityY(-420);
    }
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
      gravity: { y: 500 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
