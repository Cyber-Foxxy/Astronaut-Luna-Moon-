class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image("bg", "background.png");

    this.load.on("loaderror", (file) => {
      console.error("FAILED TO LOAD:", file.key, file.src);
    });
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#140b2e");

    const bg = this.add.image(width / 2, height / 2, "bg");
    bg.setDisplaySize(width, height);

    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.35);

    this.add.text(width / 2, 100, "Astronaut Luna Moon", {
      fontSize: "42px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 200,
      "Collect both kinds of stars\nAvoid Alien 1, Alien 2, spikes, and falling hazards",
      {
        fontSize: "24px",
        color: "#ffe680",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center"
      }
    ).setOrigin(0.5);

    this.add.text(width / 2, 295,
      "Controls:\nLEFT / RIGHT = Move\nSPACEBAR = Jump",
      {
        fontSize: "24px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center"
      }
    ).setOrigin(0.5);

    const startButton = this.add.rectangle(width / 2, 430, 240, 70, 0x8b5cf6)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, 430, "START GAME", {
      fontSize: "28px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0.5);

    startButton.on("pointerdown", () => {
      this.scene.start("MainScene", { score: 0, level: 1 });
    });
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.score = 0;
    this.level = 1;
    this.gameOverFlag = false;
    this.elapsedTime = 0;
  }

  init(data) {
    this.score = data.score || 0;
    this.level = data.level || 1;
    this.gameOverFlag = false;
    this.elapsedTime = 0;
  }

  preload() {
    this.load.setPath("assets/");

    this.load.on("loaderror", (file) => {
      console.error("FAILED TO LOAD:", file.key, file.src);
    });

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

    this.cameras.main.setBackgroundColor("#140b2e");
    this.physics.world.setBounds(0, 0, width, height);

    const bg = this.add.image(width / 2, height / 2, "bg");
    bg.setDisplaySize(width, height);

    this.platforms = this.physics.add.staticGroup();
    this.spikeGroup = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.group();

    this.buildPlatforms();
    this.buildSpikes();

    this.player = this.physics.add.sprite(100, 470, "player");
    this.player.setScale(0.24);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.02);

    this.runner = this.physics.add.sprite(560, 280, "alien1");
    this.runner.setScale(0.18);
    this.runner.setCollideWorldBounds(true);
    this.runner.setBounce(1, 0);
    this.runner.setVelocityX(90);

    this.flyer = this.physics.add.sprite(300, 170, "alien2");
    this.flyer.setScale(0.18);
    this.flyer.setAllowGravity(false);
    this.flyer.body.allowGravity = false;
    this.flyer.startY = this.flyer.y;
    this.flyer.setVelocityX(80);

    this.createCollectibles();
    this.startHazards();
    this.createUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.runner, this.platforms);
    this.physics.add.collider(this.collectibles, this.platforms);
    this.physics.add.collider(this.hazards, this.platforms, (hazard) => {
      if (hazard.y > 500) hazard.destroy();
    });

    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    this.physics.add.overlap(this.player, this.runner, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.flyer, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.spikeGroup, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitDanger, null, this);
  }

  buildPlatforms() {
    const data = [
      { x: 400, y: 530, sx: 1.2, sy: 0.6 },
      { x: 170, y: 445, sx: 0.55, sy: 0.45 },
      { x: 350, y: 375, sx: 0.55, sy: 0.45 },
      { x: 560, y: 305, sx: 0.55, sy: 0.45 },
      { x: 710, y: 395, sx: 0.50, sy: 0.42 },
      { x: 220, y: 245, sx: 0.50, sy: 0.42 },
      { x: 640, y: 200, sx: 0.50, sy: 0.42 }
    ];

    data.forEach((p) => {
      const plat = this.platforms.create(p.x, p.y, "platform");
      plat.setScale(p.sx, p.sy);
      plat.refreshBody();
    });
  }

  buildSpikes() {
    const data = [
      { x: 500, y: 505 },
      { x: 610, y: 505 },
      { x: 90, y: 505 }
    ];

    data.forEach((s) => {
      const spike = this.spikeGroup.create(s.x, s.y, "spikes");
      spike.setScale(0.22);
      spike.refreshBody();
    });
  }

  createCollectibles() {
    const items = [
      { x: 160, y: 405, key: "star1", value: 10 },
      { x: 350, y: 335, key: "star1", value: 10 },
      { x: 560, y: 265, key: "star1", value: 10 },
      { x: 700, y: 365, key: "star1", value: 15 },
      { x: 220, y: 205, key: "star2", value: 25 },
      { x: 640, y: 160, key: "star2", value: 30 }
    ];

    items.forEach((item) => {
      const star = this.collectibles.create(item.x, item.y, item.key);
      star.setScale(item.key === "star1" ? 0.10 : 0.09);
      star.setBounce(0.25);
      star.body.setGravityY(Phaser.Math.Between(35, 95));
      star.value = item.value;
    });
  }

  startHazards() {
    for (let i = 0; i < 4; i++) {
      this.spawnHazard(true);
    }

    this.hazardTimer = this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        if (!this.gameOverFlag) this.spawnHazard(false);
      }
    });
  }

  spawnHazard(initial) {
    const hazard = this.hazards.create(
      Phaser.Math.Between(50, 750),
      initial ? Phaser.Math.Between(-250, -50) : -40,
      "star2"
    );

    hazard.setScale(0.08);
    hazard.setBounce(0.1);
    hazard.setVelocityX(Phaser.Math.Between(-25, 25));
    hazard.setAngularVelocity(Phaser.Math.Between(-80, 80));
    hazard.body.setGravityY(Phaser.Math.Between(180, 250));
  }

  createUI() {
    this.scoreText = this.add.text(18, 16, `Score: ${this.score}`, {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    });

    this.levelText = this.add.text(18, 46, `Level: ${this.level}`, {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    });

    this.timerText = this.add.text(18, 76, "Time: 0.0", {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    });

    this.messageText = this.add.text(400, 300, "Collect both stars!", {
      fontSize: "28px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.time.delayedCall(1600, () => {
      if (!this.gameOverFlag) this.messageText.setText("");
    });
  }

  collectItem(player, item) {
    this.score += item.value;
    this.scoreText.setText(`Score: ${this.score}`);
    item.destroy();

    if (this.collectibles.countActive(true) === 0) {
      this.physics.pause();
      this.messageText.setText("Level Complete!");
    }
  }

  hitDanger() {
    if (this.gameOverFlag) return;

    this.gameOverFlag = true;
    this.physics.pause();
    this.messageText.setText("Game Over\nClick to Restart");

    this.input.once("pointerdown", () => {
      this.scene.restart({ score: 0, level: 1 });
    });
  }

  update(time, delta) {
    if (this.gameOverFlag) return;

    this.elapsedTime += delta / 1000;
    this.timerText.setText(`Time: ${this.elapsedTime.toFixed(1)}`);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-220);
      this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(220);
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

    if (this.runner.body.blocked.left) {
      this.runner.setVelocityX(90);
    } else if (this.runner.body.blocked.right) {
      this.runner.setVelocityX(-90);
    }

    if (this.flyer.x <= 90) {
      this.flyer.setVelocityX(80);
      this.flyer.flipX = false;
    } else if (this.flyer.x >= 710) {
      this.flyer.setVelocityX(-80);
      this.flyer.flipX = true;
    }

    this.flyer.y = this.flyer.startY + Math.sin(time / 350) * 20;

    this.hazards.children.each((hazard) => {
      if (hazard && hazard.active && hazard.y > 640) {
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
      gravity: { y: 500 },
      debug: false
    }
  },
  scene: [StartScene, MainScene]
};

new Phaser.Game(config);
