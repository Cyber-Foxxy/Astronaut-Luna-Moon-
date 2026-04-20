class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.score = 0;
    this.level = 1;
    this.gameOverFlag = false;
  }

  init(data) {
    this.score = data.score || 0;
    this.level = data.level || 1;
    this.gameOverFlag = false;
  }

  preload() {
    this.load.setPath("assets/");

    this.load.on("loaderror", (file) => {
      console.error("FAILED TO LOAD:", file.key, file.src);
    });

    this.load.on("complete", () => {
      console.log("Assets finished loading.");
    });

    this.load.image("bg", "background.png");
    this.load.image("player", "astronaut.png");
    this.load.image("alienRunner", "alien1.png");
    this.load.image("alienFlyer", "alien2.png");
    this.load.image("platform", "platform.png");
    this.load.image("spike", "spikes.png");
    this.load.image("starCollect", "star1.png");
    this.load.image("starHazard", "star2.png");
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#1d1240");
    this.physics.world.setBounds(0, 0, width, height);

    // Background
    this.bg = this.add.image(width / 2, height / 2, "bg");
    this.bg.setDisplaySize(width, height);
    this.bg.setDepth(0);

    // Dark overlay for readability
    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.18).setDepth(1);

    // Border
    const border = this.add.graphics();
    border.lineStyle(4, 0xffffff, 0.25);
    border.strokeRect(4, 4, width - 8, height - 8);
    border.lineStyle(8, 0x8b5cf6, 0.8);
    border.strokeRect(12, 12, width - 24, height - 24);
    border.setDepth(50);

    // Groups
    this.platforms = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.group();
    this.enemies = this.physics.add.group();

    this.buildPlatforms();
    this.buildSpikes();
    this.createPlayer();
    this.createEnemies();
    this.createCollectibles();
    this.startHazardSpawner();
    this.createUI();

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Physics
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.collectibles, this.platforms);
    this.physics.add.collider(this.hazards, this.platforms, this.handleHazardPlatformHit, null, this);

    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    this.physics.add.overlap(this.player, this.spikes, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitDanger, null, this);
  }

  buildPlatforms() {
    const platformData = [
      { x: 400, y: 575, scaleX: 0.28, scaleY: 0.18 },
      { x: 160, y: 485, scaleX: 0.12, scaleY: 0.12 },
      { x: 340, y: 410, scaleX: 0.12, scaleY: 0.12 },
      { x: 560, y: 330, scaleX: 0.12, scaleY: 0.12 },
      { x: 700, y: 455, scaleX: 0.11, scaleY: 0.11 },
      { x: 235, y: 255, scaleX: 0.11, scaleY: 0.11 },
      { x: 640, y: 205, scaleX: 0.11, scaleY: 0.11 }
    ];

    platformData.forEach((p) => {
      const plat = this.platforms.create(p.x, p.y, "platform");
      plat.setScale(p.scaleX, p.scaleY);
      plat.refreshBody();
    });
  }

  buildSpikes() {
    const spikeData = [
      { x: 520, y: 543 },
      { x: 610, y: 543 },
      { x: 95, y: 543 }
    ];

    spikeData.forEach((s) => {
      const spike = this.spikes.create(s.x, s.y, "spike");
      spike.setScale(0.12);
      spike.refreshBody();
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(90, 500, "player");
    this.player.setScale(0.13);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.03);

    // simpler body box
    this.player.body.setSize(
      this.player.width * 0.45,
      this.player.height * 0.70
    );
    this.player.body.setOffset(
      this.player.width * 0.28,
      this.player.height * 0.18
    );
  }

  createEnemies() {
    // Ground enemy
    this.runner = this.physics.add.sprite(590, 120, "alienRunner");
    this.runner.setScale(0.13);
    this.runner.setCollideWorldBounds(true);
    this.runner.setBounce(1, 0);
    this.runner.setVelocityX(110 + this.level * 10);

    this.runner.body.setSize(
      this.runner.width * 0.55,
      this.runner.height * 0.50
    );
    this.runner.body.setOffset(
      this.runner.width * 0.20,
      this.runner.height * 0.28
    );

    this.enemies.add(this.runner);

    // Flying enemy
    this.flyer = this.physics.add.sprite(250, 150, "alienFlyer");
    this.flyer.setScale(0.14);
    this.flyer.setAllowGravity(false);
    this.flyer.setCollideWorldBounds(true);
    this.flyer.setVelocityX(90 + this.level * 10);
    this.flyer.startY = this.flyer.y;

    this.flyer.body.setSize(
      this.flyer.width * 0.45,
      this.flyer.height * 0.70
    );
    this.flyer.body.setOffset(
      this.flyer.width * 0.28,
      this.flyer.height * 0.14
    );

    this.enemies.add(this.flyer);
  }

  createCollectibles() {
    const items = [
      { x: 150, y: 430, value: 10 },
      { x: 340, y: 355, value: 10 },
      { x: 560, y: 275, value: 10 },
      { x: 700, y: 410, value: 15 },
      { x: 235, y: 195, value: 15 },
      { x: 640, y: 145, value: 20 }
    ];

    items.forEach((item) => {
      const star = this.collectibles.create(item.x, item.y, "starCollect");
      star.setScale(0.08);
      star.setBounce(0.2);
      star.body.setGravityY(60);
      star.value = item.value;
    });
  }

  startHazardSpawner() {
    const startingHazards = Phaser.Math.Between(4, 6);

    for (let i = 0; i < startingHazards; i++) {
      this.spawnHazard(true);
    }

    this.hazardTimer = this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => {
        if (!this.gameOverFlag) {
          this.spawnHazard(false);
        }
      }
    });
  }

  spawnHazard(initialSpawn = false) {
    const { width } = this.scale;

    const hazard = this.hazards.create(
      Phaser.Math.Between(50, width - 50),
      initialSpawn ? Phaser.Math.Between(-400, -50) : -40,
      "starHazard"
    );

    hazard.setScale(0.06);
    hazard.setBounce(0.1);
    hazard.setVelocityX(Phaser.Math.Between(-30, 30));
    hazard.setAngularVelocity(Phaser.Math.Between(-90, 90));
    hazard.body.setGravityY(Phaser.Math.Between(220, 300) + this.level * 20);
  }

  createUI() {
    this.scoreText = this.add.text(18, 16, `Score: ${this.score}`, {
      fontSize: "22px",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setDepth(100);

    this.levelText = this.add.text(18, 46, `Level: ${this.level}`, {
      fontSize: "22px",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setDepth(100);

    this.infoText = this.add.text(
      400,
      16,
      "LEFT / RIGHT to move   |   SPACE to jump",
      {
        fontSize: "18px",
        fill: "#ffe680",
        stroke: "#000000",
        strokeThickness: 5
      }
    ).setOrigin(0.5, 0).setDepth(100);

    this.messageText = this.add.text(400, 300, "Collect all the stars!", {
      fontSize: "28px",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5).setDepth(100);

    this.time.delayedCall(1800, () => {
      if (!this.gameOverFlag) {
        this.messageText.setText("");
      }
    });
  }

  collectItem(player, item) {
    this.score += item.value;
    this.scoreText.setText(`Score: ${this.score}`);
    item.destroy();

    if (this.collectibles.countActive(true) === 0) {
      this.levelComplete();
    }
  }

  handleHazardPlatformHit(hazard) {
    if (hazard.y > 535) {
      hazard.destroy();
    }
  }

  hitDanger() {
    if (this.gameOverFlag) return;

    this.gameOverFlag = true;
    this.physics.pause();
    this.player.setTint(0xff6666);
    this.messageText.setText("Game Over\nClick to Restart");

    this.input.once("pointerdown", () => {
      this.scene.restart({ score: 0, level: 1 });
    });
  }

  levelComplete() {
    this.physics.pause();
    this.messageText.setText(`Level ${this.level} Complete!`);

    this.time.delayedCall(1200, () => {
      this.scene.restart({
        score: this.score,
        level: this.level + 1
      });
    });
  }

  update(time) {
    if (this.gameOverFlag) return;

    const moveSpeed = 220;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-moveSpeed);
      this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(moveSpeed);
      this.player.flipX = false;
    } else {
      this.player.setVelocityX(0);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
      this.player.body.blocked.down
    ) {
      this.player.setVelocityY(-380);
    }

    if (this.runner) {
      if (this.runner.body.blocked.left) {
        this.runner.setVelocityX(110 + this.level * 10);
      } else if (this.runner.body.blocked.right) {
        this.runner.setVelocityX(-(110 + this.level * 10));
      }
    }

    if (this.flyer) {
      if (this.flyer.x <= 70) {
        this.flyer.setVelocityX(90 + this.level * 10);
        this.flyer.flipX = false;
      } else if (this.flyer.x >= 730) {
        this.flyer.setVelocityX(-(90 + this.level * 10));
        this.flyer.flipX = true;
      }

      this.flyer.y = this.flyer.startY + Math.sin(time / 350) * 18;
    }

    this.hazards.children.each((hazard) => {
      if (hazard && hazard.active && hazard.y > 650) {
        hazard.destroy();
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
      gravity: { y: 520 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
