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
    // This tells Phaser all assets are inside the assets folder
    this.load.setPath("assets/");

    this.load.on("loaderror", (file) => {
      console.error("FAILED TO LOAD:", file.key, file.src);
    });

    this.load.on("complete", () => {
      console.log("All assets finished loading.");
    });

    this.load.image("bg", "background.jpg");
    this.load.image("player", "astronaut2.png");
    this.load.image("alienRunner", "alien2.jpg");
    this.load.image("alienFlyer", "alien3.webp");
    this.load.image("platform", "platform.png");
    this.load.image("spike", "spikes.png");
    this.load.image("starCollect", "star1.png");
    this.load.image("starHazard", "star2.webp");
  }

  create() {
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor("#120b2f");

    this.bg = this.add.image(width / 2, height / 2, "bg");
    this.bg.setDisplaySize(width, height);

    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x120b2f,
      0.18
    );
    overlay.setDepth(1);

    const border = this.add.graphics();
    border.lineStyle(4, 0xffffff, 0.3);
    border.strokeRect(4, 4, width - 8, height - 8);
    border.lineStyle(8, 0x8b5cf6, 0.8);
    border.strokeRect(12, 12, width - 24, height - 24);
    border.setDepth(20);

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

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.collectibles, this.platforms);
    this.physics.add.collider(
      this.hazards,
      this.platforms,
      this.handleHazardPlatformHit,
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.collectibles,
      this.collectItem,
      null,
      this
    );
    this.physics.add.overlap(this.player, this.spikes, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitDanger, null, this);
  }

  buildPlatforms() {
    const platformData = [
      { x: 400, y: 570, scaleX: 0.42, scaleY: 0.22 },
      { x: 170, y: 485, scaleX: 0.16, scaleY: 0.14 },
      { x: 360, y: 410, scaleX: 0.16, scaleY: 0.14 },
      { x: 575, y: 335, scaleX: 0.16, scaleY: 0.14 },
      { x: 710, y: 460, scaleX: 0.14, scaleY: 0.14 },
      { x: 230, y: 255, scaleX: 0.14, scaleY: 0.14 },
      { x: 655, y: 205, scaleX: 0.14, scaleY: 0.14 }
    ];

    platformData.forEach((p) => {
      const plat = this.platforms.create(p.x, p.y, "platform");
      plat.setScale(p.scaleX, p.scaleY);
      plat.refreshBody();
    });
  }

  buildSpikes() {
    const spikeData = [
      { x: 525, y: 545 },
      { x: 615, y: 545 },
      { x: 100, y: 545 }
    ];

    spikeData.forEach((s) => {
      const spike = this.spikes.create(s.x, s.y, "spike");
      spike.setScale(0.16);
      spike.refreshBody();
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(100, 470, "player");
    this.player.setScale(0.12);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.03);

    this.player.body.setSize(
      this.player.width * 0.35,
      this.player.height * 0.72
    );
    this.player.body.setOffset(
      this.player.width * 0.33,
      this.player.height * 0.14
    );
  }

  createEnemies() {
    this.runner = this.physics.add.sprite(580, 110, "alienRunner");
    this.runner.setScale(0.16);
    this.runner.setCollideWorldBounds(true);
    this.runner.setBounce(1, 0);
    this.runner.setVelocityX(120 + this.level * 10);
    this.runner.body.setSize(
      this.runner.width * 0.55,
      this.runner.height * 0.55
    );
    this.runner.body.setOffset(
      this.runner.width * 0.18,
      this.runner.height * 0.22
    );
    this.enemies.add(this.runner);

    this.flyer = this.physics.add.sprite(240, 140, "alienFlyer");
    this.flyer.setScale(0.22);
    this.flyer.setCollideWorldBounds(true);
    this.flyer.setAllowGravity(false);
    this.flyer.setVelocityX(100 + this.level * 10);
    this.flyer.startY = this.flyer.y;
    this.flyer.body.setSize(
      this.flyer.width * 0.42,
      this.flyer.height * 0.6
    );
    this.flyer.body.setOffset(
      this.flyer.width * 0.28,
      this.flyer.height * 0.14
    );
    this.enemies.add(this.flyer);
  }

  createCollectibles() {
    const starData = [
      { x: 150, y: 425, value: 10 },
      { x: 350, y: 350, value: 10 },
      { x: 565, y: 275, value: 10 },
      { x: 700, y: 405, value: 15 },
      { x: 225, y: 190, value: 15 },
      { x: 655, y: 140, value: 20 }
    ];

    starData.forEach((item) => {
      const star = this.collectibles.create(item.x, item.y, "starCollect");
      star.setScale(0.08);
      star.setBounce(0.2);
      star.body.setGravityY(70);
      star.value = item.value;
    });
  }

  startHazardSpawner() {
    const startingHazards = Phaser.Math.Between(4 + this.level, 7 + this.level);

    for (let i = 0; i < startingHazards; i++) {
      this.spawnHazard(true);
    }

    this.hazardTimer = this.time.addEvent({
      delay: 1100,
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
      Phaser.Math.Between(40, width - 40),
      initialSpawn ? Phaser.Math.Between(-500, -50) : -40,
      "starHazard"
    );

    hazard.setScale(0.06);
    hazard.setBounce(0.15);
    hazard.setVelocityX(Phaser.Math.Between(-35, 35));
    hazard.setAngularVelocity(Phaser.Math.Between(-100, 100));
    hazard.body.setGravityY(Phaser.Math.Between(220, 320) + this.level * 25);
  }

  createUI() {
    this.scoreText = this.add.text(18, 16, `Score: ${this.score}`, {
      fontSize: "22px",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setDepth(30);

    this.levelText = this.add.text(18, 46, `Level: ${this.level}`, {
      fontSize: "22px",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setDepth(30);

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
    ).setOrigin(0.5, 0).setDepth(30);

    this.messageText = this.add.text(400, 300, "", {
      fontSize: "34px",
      align: "center",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(40);
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

    const moveSpeed = 230;

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
      this.player.setVelocityY(-390);
    }

    if (this.runner) {
      if (this.runner.body.blocked.left) {
        this.runner.setVelocityX(120 + this.level * 10);
      } else if (this.runner.body.blocked.right) {
        this.runner.setVelocityX(-(120 + this.level * 10));
      }
    }

    if (this.flyer) {
      if (this.flyer.x <= 70) {
        this.flyer.setVelocityX(100 + this.level * 10);
        this.flyer.flipX = false;
      } else if (this.flyer.x >= 730) {
        this.flyer.setVelocityX(-(100 + this.level * 10));
        this.flyer.flipX = true;
      }

      this.flyer.y = this.flyer.startY + Math.sin(time / 350) * 22;
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
