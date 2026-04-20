
class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.level = 1;
    this.score = 0;
    this.gameOverFlag = false;
  }

  init(data) {
    if (data.level) this.level = data.level;
    if (typeof data.score === "number") this.score = data.score;
  }

  preload() {}

  create() {
    const { width, height } = this.scale;

    this.gameOverFlag = false;

    this.createTextures();
    this.drawBackground();

    // Platforms
    this.platforms = this.physics.add.staticGroup();

    // Floor raised so bottom is visible
    this.platforms.create(width / 2, height - 30, "platformWide");

    // Rearranged platforms
    this.platforms.create(140, 500, "platform");
    this.platforms.create(320, 420, "platform");
    this.platforms.create(520, 340, "platform");
    this.platforms.create(700, 460, "platform");
    this.platforms.create(640, 230, "platform");
    this.platforms.create(220, 260, "platform");

    // Player
    this.player = this.physics.add.sprite(100, 520, "astronaut");
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);
    this.player.body.setSize(40, 58);
    this.player.body.setOffset(12, 8);

    // Alien enemy
    this.alien = this.physics.add.sprite(600, 180, "alien");
    this.alien.setCollideWorldBounds(true);
    this.alien.setBounce(1, 0);
    this.alien.setVelocityX(120 + this.level * 20);

    // Falling hazards group
    this.fallingObjects = this.physics.add.group();

    // Random amount of falling objects
    const fallCount = Phaser.Math.Between(6 + this.level, 10 + this.level * 2);
    for (let i = 0; i < fallCount; i++) {
      this.spawnFallingObject(true);
    }

    // Collectibles
    this.collectibles = this.physics.add.group();

    // Random stars and planets to collect
    for (let i = 0; i < 6; i++) {
      const type = Math.random() < 0.65 ? "starCollect" : "planetCollect";
      const item = this.collectibles.create(
        Phaser.Math.Between(80, 720),
        Phaser.Math.Between(40, 180),
        type
      );
      item.setBounce(0.4);
      item.body.setGravityY(120);
      item.value = type === "starCollect" ? 10 : 25;
    }

    // UI
    this.scoreText = this.add.text(18, 14, `Score: ${this.score}`, {
      fontSize: "22px",
      color: "#ffffff"
    }).setDepth(10);

    this.levelText = this.add.text(18, 42, `Level: ${this.level}`, {
      fontSize: "22px",
      color: "#ffffff"
    }).setDepth(10);

    this.infoText = this.add.text(width / 2, 16, "SPACE = Jump | Avoid alien + falling objects", {
      fontSize: "18px",
      color: "#ffe680"
    }).setOrigin(0.5, 0).setDepth(10);

    this.messageText = this.add.text(width / 2, height / 2, "", {
      fontSize: "36px",
      color: "#ffccff",
      stroke: "#000000",
      strokeThickness: 5,
      align: "center"
    }).setOrigin(0.5).setDepth(10);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.alien, this.platforms);
    this.physics.add.collider(this.collectibles, this.platforms);
    this.physics.add.collider(this.fallingObjects, this.platforms, this.hitGround, null, this);

    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    this.physics.add.overlap(this.player, this.fallingObjects, this.hitHazard, null, this);
    this.physics.add.overlap(this.player, this.alien, this.hitHazard, null, this);

    // Timer event to keep dropping hazards
    this.spawnTimer = this.time.addEvent({
      delay: Phaser.Math.Between(900, 1500),
      callback: () => {
        if (!this.gameOverFlag) {
          this.spawnFallingObject(false);
          this.spawnTimer.delay = Phaser.Math.Between(700, 1400);
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  createTextures() {
    if (!this.textures.exists("astronaut")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });

      // astronaut body
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(16, 18, 32, 44, 12);

      // helmet
      g.fillStyle(0xf8f8ff, 1);
      g.fillCircle(32, 18, 18);

      // visor
      g.fillStyle(0x33b5ff, 1);
      g.fillEllipse(32, 18, 24, 18);

      // arms
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(6, 26, 12, 26, 8);
      g.fillRoundedRect(46, 26, 12, 26, 8);

      // legs
      g.fillRoundedRect(18, 54, 10, 18, 6);
      g.fillRoundedRect(36, 54, 10, 18, 6);

      // pink accents
      g.fillStyle(0xff4fb3, 1);
      g.fillCircle(32, 38, 4);
      g.fillRect(8, 34, 8, 4);
      g.fillRect(48, 34, 8, 4);
      g.fillRect(19, 62, 8, 4);
      g.fillRect(37, 62, 8, 4);

      g.generateTexture("astronaut", 64, 80);
      g.destroy();
    }

    if (!this.textures.exists("alien")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });

      g.clear();

      // head
      g.fillStyle(0x8cff4a, 1);
      g.fillEllipse(32, 22, 34, 38);

      // body
      g.fillStyle(0x79e03e, 1);
      g.fillRoundedRect(20, 38, 24, 26, 10);

      // eyes
      g.fillStyle(0x111111, 1);
      g.fillEllipse(24, 20, 8, 13);
      g.fillEllipse(40, 20, 8, 13);

      // shine
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(22, 16, 2);
      g.fillCircle(38, 16, 2);

      // antennae
      g.lineStyle(2, 0x8cff4a, 1);
      g.beginPath();
      g.moveTo(24, 5);
      g.lineTo(20, -4);
      g.moveTo(40, 5);
      g.lineTo(44, -4);
      g.strokePath();

      g.fillStyle(0xb8ff88, 1);
      g.fillCircle(20, 0, 3);
      g.fillCircle(44, 0, 3);

      // arms
      g.fillStyle(0x79e03e, 1);
      g.fillRoundedRect(10, 40, 10, 20, 6);
      g.fillRoundedRect(44, 40, 10, 20, 6);

      // legs
      g.fillRoundedRect(22, 60, 8, 14, 5);
      g.fillRoundedRect(34, 60, 8, 14, 5);

      g.generateTexture("alien", 64, 80);
      g.destroy();
    }

    if (!this.textures.exists("starCollect")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.clear();
      g.fillStyle(0xffea00, 1);

      const pts = [
        20, 0,
        25, 14,
        40, 14,
        28, 24,
        33, 40,
        20, 30,
        7, 40,
        12, 24,
        0, 14,
        15, 14
      ];

      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) {
        g.lineTo(pts[i], pts[i + 1]);
      }
      g.closePath();
      g.fillPath();

      g.lineStyle(2, 0xffc400, 1);
      g.strokePath();

      g.generateTexture("starCollect", 40, 40);
      g.destroy();
    }

    if (!this.textures.exists("planetCollect")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.clear();

      g.fillStyle(0xffa234, 1);
      g.fillCircle(28, 28, 16);

      g.lineStyle(4, 0xcfd8dc, 1);
      g.beginPath();
      g.ellipse(28, 28, 26, 10, -0.2, 0, Math.PI * 2);
      g.strokePath();

      g.generateTexture("planetCollect", 56, 56);
      g.destroy();
    }

    if (!this.textures.exists("starHazard")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.clear();
      g.fillStyle(0xff4d6d, 1);

      const pts = [
        18, 0,
        23, 11,
        36, 12,
        26, 20,
        30, 34,
        18, 26,
        6, 34,
        10, 20,
        0, 12,
        13, 11
      ];

      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) {
        g.lineTo(pts[i], pts[i + 1]);
      }
      g.closePath();
      g.fillPath();

      g.generateTexture("starHazard", 36, 36);
      g.destroy();
    }

    if (!this.textures.exists("planetHazard")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.clear();

      g.fillStyle(0x7c5cff, 1);
      g.fillCircle(22, 22, 14);

      g.lineStyle(3, 0xffffff, 1);
      g.beginPath();
      g.ellipse(22, 22, 24, 8, 0.4, 0, Math.PI * 2);
      g.strokePath();

      g.generateTexture("planetHazard", 44, 44);
      g.destroy();
    }

    if (!this.textures.exists("platform")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.clear();
      g.fillStyle(0x8a6cff, 1);
      g.fillRoundedRect(0, 0, 120, 20, 8);
      g.lineStyle(3, 0xd9c8ff, 1);
      g.strokeRoundedRect(0, 0, 120, 20, 8);
      g.generateTexture("platform", 120, 20);
      g.destroy();
    }

    if (!this.textures.exists("platformWide")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.clear();
      g.fillStyle(0x8a6cff, 1);
      g.fillRoundedRect(0, 0, 820, 24, 10);
      g.lineStyle(4, 0xd9c8ff, 1);
      g.strokeRoundedRect(0, 0, 820, 24, 10);
      g.generateTexture("platformWide", 820, 24);
      g.destroy();
    }
  }

  drawBackground() {
    const { width, height } = this.scale;

    const bg = this.add.graphics();

    bg.fillGradientStyle(0x09091a, 0x12123a, 0x1a1240, 0x09091a, 1);
    bg.fillRect(0, 0, width, height);

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(10, width - 10);
      const y = Phaser.Math.Between(10, height - 10);
      const r = Phaser.Math.Between(1, 2);
      bg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.4, 1));
      bg.fillCircle(x, y, r);
    }

    // glowing purple nebula blobs
    for (let i = 0; i < 8; i++) {
      bg.fillStyle(0x8b3dff, 0.12);
      bg.fillCircle(
        Phaser.Math.Between(80, width - 80),
        Phaser.Math.Between(80, height - 80),
        Phaser.Math.Between(50, 110)
      );
    }

    // inner edge/border
    bg.lineStyle(4, 0xffffff, 0.3);
    bg.strokeRect(4, 4, width - 8, height - 8);

    bg.lineStyle(8, 0x8a6cff, 0.7);
    bg.strokeRect(10, 10, width - 20, height - 20);
  }

  spawnFallingObject(initialSpawn = false) {
    const { width } = this.scale;
    const type = Math.random() < 0.55 ? "starHazard" : "planetHazard";

    const obj = this.fallingObjects.create(
      Phaser.Math.Between(40, width - 40),
      initialSpawn ? Phaser.Math.Between(-400, -40) : -40,
      type
    );

    obj.setBounce(0.2);
    obj.setCollideWorldBounds(false);
    obj.body.setGravityY(Phaser.Math.Between(180, 320) + this.level * 25);
    obj.setVelocityX(Phaser.Math.Between(-40, 40));

    if (type === "starHazard") {
      obj.damage = 1;
      obj.setAngularVelocity(Phaser.Math.Between(-180, 180));
    } else {
      obj.damage = 1;
      obj.setAngularVelocity(Phaser.Math.Between(-120, 120));
    }
  }

  collectItem(player, item) {
    this.score += item.value;
    this.scoreText.setText(`Score: ${this.score}`);
    item.destroy();

    if (this.collectibles.countActive(true) === 0) {
      this.nextLevel();
    }
  }

  hitGround(object, platform) {
    if (object.y > 560) {
      object.destroy();
    }
  }

  hitHazard() {
    if (this.gameOverFlag) return;

    this.gameOverFlag = true;
    this.physics.pause();
    this.player.setTint(0xff4d6d);
    this.messageText.setText("Game Over\nClick to Restart");

    this.input.once("pointerdown", () => {
      this.scene.restart({ level: 1, score: 0 });
      this.level = 1;
      this.score = 0;
    });
  }

  nextLevel() {
    this.physics.pause();
    this.messageText.setText(`Level ${this.level} Complete!`);

    this.time.delayedCall(1200, () => {
      this.scene.restart({
        level: this.level + 1,
        score: this.score
      });
    });
  }

  update() {
    if (this.gameOverFlag) return;

    const speed = 220;

    // player movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    // jump with space only
    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
      this.player.body.blocked.down
    ) {
      this.player.setVelocityY(-390);
    }

    // alien movement
    if (this.alien.body.blocked.left) {
      this.alien.setVelocityX(120 + this.level * 20);
    } else if (this.alien.body.blocked.right) {
      this.alien.setVelocityX(-(120 + this.level * 20));
    }

    // clean up falling objects offscreen
    this.fallingObjects.children.each((obj) => {
      if (obj && obj.active && obj.y > 650) {
        obj.destroy();
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
      gravity: { y: 500 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
