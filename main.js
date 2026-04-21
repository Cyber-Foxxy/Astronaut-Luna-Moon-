

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

    this.cameras.main.setBackgroundColor("#140b2e");

    const bg = this.add.image(width / 2, height / 2, "bg");
    bg.setDisplaySize(width, height);

    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.35);

    const border = this.add.graphics();
    border.lineStyle(4, 0xffffff, 0.22);
    border.strokeRect(4, 4, width - 8, height - 8);
    border.lineStyle(8, 0x8b5cf6, 0.82);
    border.strokeRect(12, 12, width - 24, height - 24);

    this.add.text(width / 2, 110, "Astronaut Luna Moon", {
      fontSize: "42px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 190,
      "Collect both kinds of stars\nAvoid Alien 1, Alien 2, spikes, and falling hazards",
      {
        fontSize: "24px",
        color: "#ffe680",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center"
      }
    ).setOrigin(0.5);

    this.add.text(width / 2, 285,
      "Controls:\nLEFT / RIGHT = Move\nSPACEBAR = Jump",
      {
        fontSize: "24px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center"
      }
    ).setOrigin(0.5);

    const startButton = this.add.rectangle(width / 2, 430, 250, 70, 0x8b5cf6, 1)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const startText = this.add.text(width / 2, 430, "START GAME", {
      fontSize: "28px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setOrigin(0.5);

    startButton.on("pointerover", () => {
      startButton.setFillStyle(0xa855f7);
    });

    startButton.on("pointerout", () => {
      startButton.setFillStyle(0x8b5cf6);
    });

    startButton.on("pointerdown", () => {
      this.scene.start("MainScene", { score: 0, level: 1 });
    });

    this.add.text(width / 2, 520, "Click START GAME to begin", {
      fontSize: "20px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.score = 0;
    this.level = 1;
    this.gameOverFlag = false;
    this.elapsedTime = 0;
    this.bestTime = null;
  }

  init(data) {
    this.score = data.score || 0;
    this.level = data.level || 1;
    this.gameOverFlag = false;
    this.elapsedTime = 0;
    this.bestTime = localStorage.getItem("lunaMoonBestTime");
  }

  preload() {
    this.load.setPath("assets/");

    this.load.on("loaderror", (file) => {
      console.error("FAILED TO LOAD:", file.key, file.src);
    });

    this.load.image("bg", "background.png");
    this.load.image("playerRaw", "astronaut.png");
    this.load.image("alienRunnerRaw", "alien1.png");
    this.load.image("alienFlyerRaw", "alien2.png");
    this.load.image("platformRaw", "platform.png");
    this.load.image("spikeRaw", "spikes.png");
    this.load.image("starCollectRaw", "star1.png");
    this.load.image("starHazardRaw", "star2.png");
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#140b2e");
    this.physics.world.setBounds(0, 0, width, height);

    this.makeTransparentTexture("playerRaw", "player");
    this.makeTransparentTexture("alienRunnerRaw", "alienRunner");
    this.makeTransparentTexture("alienFlyerRaw", "alienFlyer");
    this.makeTransparentTexture("platformRaw", "platform");
    this.makeTransparentTexture("spikeRaw", "spike");
    this.makeTransparentTexture("starCollectRaw", "starCollect");
    this.makeTransparentTexture("starHazardRaw", "starHazard");

    this.bg = this.add.image(width / 2, height / 2, "bg");
    this.bg.setDisplaySize(width, height);

    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.12);

    const border = this.add.graphics();
    border.lineStyle(4, 0xffffff, 0.2);
    border.strokeRect(4, 4, width - 8, height - 8);
    border.lineStyle(8, 0x8b5cf6, 0.82);
    border.strokeRect(12, 12, width - 24, height - 24);
    border.setDepth(100);

    this.platforms = this.physics.add.staticGroup();
    this.spikes = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.group();

    this.buildPlatforms();
    this.buildSpikes();
    this.createPlayer();
    this.createEnemies();
    this.createCollectibles();
    this.startHazardSpawner();
    this.createUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.runner, this.platforms);
    this.physics.add.collider(this.collectibles, this.platforms);
    this.physics.add.collider(this.hazards, this.platforms, this.handleHazardPlatformHit, null, this);

    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    this.physics.add.overlap(this.player, this.spikes, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.runner, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.flyer, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitDanger, null, this);
  }

  makeTransparentTexture(sourceKey, newKey) {
    if (this.textures.exists(newKey)) return;

    const sourceImage = this.textures.get(sourceKey).getSourceImage();
    const canvas = this.textures.createCanvas(newKey, sourceImage.width, sourceImage.height);
    const ctx = canvas.getContext();

    ctx.drawImage(sourceImage, 0, 0);

    const imageData = ctx.getImageData(0, 0, sourceImage.width, sourceImage.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a === 0) continue;

      const lightGray = r > 215 && g > 215 && b > 215;
      const palePeach = r > 215 && g > 185 && b > 180;
      const nearWhite = r > 240 && g > 240 && b > 240;

      if (lightGray || palePeach || nearWhite) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    canvas.refresh();
  }

  buildPlatforms() {
    const platformData = [
      { x: 400, y: 555, scaleX: 1.35, scaleY: 0.70 },
      { x: 170, y: 465, scaleX: 0.62, scaleY: 0.52 },
      { x: 360, y: 390, scaleX: 0.62, scaleY: 0.52 },
      { x: 560, y: 320, scaleX: 0.62, scaleY: 0.52 },
      { x: 710, y: 425, scaleX: 0.55, scaleY: 0.48 },
      { x: 225, y: 255, scaleX: 0.55, scaleY: 0.48 },
      { x: 640, y: 210, scaleX: 0.55, scaleY: 0.48 }
    ];

    platformData.forEach((p) => {
      const plat = this.platforms.create(p.x, p.y, "platform");
      plat.setScale(p.scaleX, p.scaleY);
      plat.refreshBody();
    });
  }

  buildSpikes() {
    const spikeData = [
      { x: 500, y: 525 },
      { x: 610, y: 525 },
      { x: 90, y: 525 }
    ];

    spikeData.forEach((s) => {
      const spike = this.spikes.create(s.x, s.y, "spike");
      spike.setScale(0.28);
      spike.refreshBody();
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(90, 485, "player");
    this.player.setScale(0.28);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.02);

    this.player.body.setSize(
      this.player.width * 0.42,
      this.player.height * 0.68
    );
    this.player.body.setOffset(
      this.player.width * 0.28,
      this.player.height * 0.22
    );
  }

  createEnemies() {
    this.runner = this.physics.add.sprite(560, 250, "alienRunner");
    this.runner.setScale(0.18);
    this.runner.setCollideWorldBounds(true);
    this.runner.setBounce(1, 0);
    this.runner.setVelocityX(95 + this.level * 10);

    this.runner.body.setSize(
      this.runner.width * 0.72,
      this.runner.height * 0.52
    );
    this.runner.body.setOffset(
      this.runner.width * 0.12,
      this.runner.height * 0.30
    );

    this.flyer = this.physics.add.sprite(300, 165, "alienFlyer");
    this.flyer.setScale(0.20);
    this.flyer.setAllowGravity(false);
    this.flyer.body.allowGravity = false;
    this.flyer.setImmovable(true);
    this.flyer.startY = this.flyer.y;
    this.flyer.setVelocityX(85 + this.level * 8);

    this.flyer.body.setSize(
      this.flyer.width * 0.45,
      this.flyer.height * 0.75
    );
    this.flyer.body.setOffset(
      this.flyer.width * 0.28,
      this.flyer.height * 0.10
    );
  }

  createCollectibles() {
    const items = [
      { x: 160, y: 405, key: "starCollect", value: 10 },
      { x: 355, y: 330, key: "starCollect", value: 10 },
      { x: 560, y: 260, key: "starCollect", value: 10 },
      { x: 710, y: 395, key: "starCollect", value: 15 },
      { x: 225, y: 220, key: "starHazard", value: 25 },
      { x: 640, y: 175, key: "starHazard", value: 30 }
    ];

    items.forEach((item) => {
      const star = this.collectibles.create(item.x, item.y, item.key);
      star.setScale(item.key === "starCollect" ? 0.10 : 0.09);
      star.setBounce(0.25);
      star.body.setGravityY(Phaser.Math.Between(35, 95));
      star.value = item.value;
    });
  }

  startHazardSpawner() {
    const startingHazards = Phaser.Math.Between(3, 5);

    for (let i = 0; i < startingHazards; i++) {
      this.spawnHazard(true);
    }

    this.hazardTimer = this.time.addEvent({
      delay: 1400,
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
      initialSpawn ? Phaser.Math.Between(-300, -50) : -40,
      "starHazard"
    );

    hazard.setScale(0.08);
    hazard.setBounce(0.1);
    hazard.setVelocityX(Phaser.Math.Between(-25, 25));
    hazard.setAngularVelocity(Phaser.Math.Between(-80, 80));
    hazard.body.setGravityY(Phaser.Math.Between(180, 250) + this.level * 15);
  }

  createUI() {
    this.scoreText = this.add.text(18, 16, `Score: ${this.score}`, {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setDepth(200);

    this.levelText = this.add.text(18, 46, `Level: ${this.level}`, {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setDepth(200);

    this.timerText = this.add.text(18, 76, `Time: 0.0`, {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setDepth(200);

    const bestText = this.bestTime ? Number(this.bestTime).toFixed(1) : "--";
    this.bestTimeText = this.add.text(18, 106, `Best: ${bestText}`, {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    }).setDepth(200);

    this.infoText = this.add.text(
      470,
      16,
      "LEFT / RIGHT move  |  SPACE jump  |  avoid aliens + spikes",
      {
        fontSize: "18px",
        color: "#ffe680",
        stroke: "#000000",
        strokeThickness: 5
      }
    ).setOrigin(0.5, 0).setDepth(200);

    this.messageText = this.add.text(400, 300, "Collect both kinds of stars!", {
      fontSize: "28px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5).setDepth(200);

    this.time.delayedCall(1800, () => {
      if (!this.gameOverFlag) this.messageText.setText("");
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
    if (hazard.y > 515) {
      hazard.destroy();
    }
  }

  hitDanger() {
    if (this.gameOverFlag) return;

    this.gameOverFlag = true;
    this.physics.pause();
    this.player.setTint(0xff6666);

    if (this.hazardTimer) this.hazardTimer.paused = true;

    this.messageText.setText("Game Over\nClick to Restart");

    this.input.once("pointerdown", () => {
      this.scene.restart({ score: 0, level: 1 });
    });
  }

  levelComplete() {
    this.physics.pause();
    if (this.hazardTimer) this.hazardTimer.paused = true;

    if (!this.bestTime || this.elapsedTime < Number(this.bestTime)) {
      localStorage.setItem("lunaMoonBestTime", this.elapsedTime.toFixed(1));
      this.bestTime = this.elapsedTime.toFixed(1);
    }

    this.messageText.setText(`Level ${this.level} Complete!`);

    this.time.delayedCall(1200, () => {
      this.scene.restart({
        score: this.score,
        level: this.level + 1
      });
    });
  }

  update(time, delta) {
    if (this.gameOverFlag) return;

    this.elapsedTime += delta / 1000;
    this.timerText.setText(`Time: ${this.elapsedTime.toFixed(1)}`);

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
      this.player.setVelocityY(-390);
    }

    if (this.runner) {
      if (this.runner.body.blocked.left) {
        this.runner.setVelocityX(95 + this.level * 10);
      } else if (this.runner.body.blocked.right) {
        this.runner.setVelocityX(-(95 + this.level * 10));
      }
    }

    if (this.flyer) {
      if (this.flyer.x <= 90) {
        this.flyer.setVelocityX(85 + this.level * 8);
        this.flyer.flipX = false;
      } else if (this.flyer.x >= 710) {
        this.flyer.setVelocityX(-(85 + this.level * 8));
        this.flyer.flipX = true;
      }

      this.flyer.y = this.flyer.startY + Math.sin(time / 350) * 20;
    }

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
