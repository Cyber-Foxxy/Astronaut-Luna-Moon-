
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

    const border = this.add.graphics();
    border.lineStyle(4, 0xffffff, 0.25);
    border.strokeRect(4, 4, width - 8, height - 8);
    border.lineStyle(8, 0x8b5cf6, 0.82);
    border.strokeRect(12, 12, width - 24, height - 24);

    this.add.text(width / 2, 95, "Astronaut Luna Moon", {
      fontSize: "42px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(
      width / 2,
      185,
      "Collect both kinds of stars\nAvoid Alien 1, Alien 2, spikes, and falling hazards",
      {
        fontSize: "24px",
        color: "#ffe680",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center"
      }
    ).setOrigin(0.5);

    this.add.text(
      width / 2,
      290,
      "Controls:\nLEFT / RIGHT ARROWS = Move\nSPACEBAR = Jump",
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

    startButton.on("pointerover", () => startButton.setFillStyle(0xa855f7));
    startButton.on("pointerout", () => startButton.setFillStyle(0x8b5cf6));
    startButton.on("pointerdown", () => {
      this.scene.start("MainScene", { score: 0, level: 1, lives: 3 });
    });
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.elapsedTime = 0;
    this.gameOverFlag = false;
    this.isInvincible = false;
  }

  init(data) {
    this.score = data.score || 0;
    this.level = data.level || 1;
    this.lives = data.lives ?? 3;
    this.elapsedTime = 0;
    this.gameOverFlag = false;
    this.isInvincible = false;
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

    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.12);

    const border = this.add.graphics();
    border.lineStyle(4, 0xffffff, 0.2);
    border.strokeRect(4, 4, width - 8, height - 8);
    border.lineStyle(8, 0x8b5cf6, 0.82);
    border.strokeRect(12, 12, width - 24, height - 24);
    border.setDepth(100);

    this.platforms = this.physics.add.staticGroup();
    this.spikeGroup = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.group();

    this.buildPlatforms();
    this.buildSpikes();
    this.createPlayer();
    this.createEnemies();
    this.createCollectibles();
    this.startHazards();
    this.createUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.runner, this.platforms);
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
    this.physics.add.overlap(this.player, this.runner, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.flyer, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.spikeGroup, this.hitDanger, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitDanger, null, this);
  }

  buildPlatforms() {
    const data = [
      { x: 400, y: 510, sx: 1.05, sy: 0.58 },
      { x: 170, y: 435, sx: 0.48, sy: 0.42 },
      { x: 330, y: 365, sx: 0.48, sy: 0.42 },
      { x: 500, y: 300, sx: 0.48, sy: 0.42 },
      { x: 670, y: 240, sx: 0.48, sy: 0.42 },
      { x: 700, y: 395, sx: 0.40, sy: 0.36 },
      { x: 220, y: 235, sx: 0.40, sy: 0.36 }
    ];

    data.forEach((p) => {
      const plat = this.platforms.create(p.x, p.y, "platform");
      plat.setScale(p.sx, p.sy);
      plat.refreshBody();
    });
  }

  buildSpikes() {
    const data = [
      { x: 500, y: 486 },
      { x: 600, y: 486 },
      { x: 92, y: 486 }
    ];

    data.forEach((s) => {
      const spike = this.spikeGroup.create(s.x, s.y, "spikes");
      spike.setScale(0.18);
      spike.refreshBody();
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(100, 455, "player");
    this.player.setScale(0.13);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.02);

    this.player.body.setSize(
      this.player.width * 0.34,
      this.player.height * 0.52
    );
    this.player.body.setOffset(
      this.player.width * 0.33,
      this.player.height * 0.30
    );
  }

  createEnemies() {
    this.runner = this.physics.add.sprite(500, 250, "alien1");
    this.runner.setScale(0.14);
    this.runner.setCollideWorldBounds(false);
    this.runner.setBounce(1, 0);
    this.runner.setVelocityX(85 + this.level * 8);

    this.runner.body.setSize(
      this.runner.width * 0.62,
      this.runner.height * 0.42
    );
    this.runner.body.setOffset(
      this.runner.width * 0.18,
      this.runner.height * 0.36
    );

    this.flyer = this.physics.add.sprite(300, 155, "alien2");
    this.flyer.setScale(0.16);
    this.flyer.body.allowGravity = false;
    this.flyer.setImmovable(true);
    this.flyer.startY = this.flyer.y;
    this.flyer.setVelocityX(70 + this.level * 6);

    this.flyer.body.setSize(
      this.flyer.width * 0.42,
      this.flyer.height * 0.62
    );
    this.flyer.body.setOffset(
      this.flyer.width * 0.30,
      this.flyer.height * 0.18
    );
  }

  createCollectibles() {
    const items = [
      { x: 170, y: 395, key: "star1", value: 10 },
      { x: 330, y: 325, key: "star1", value: 10 },
      { x: 500, y: 260, key: "star1", value: 15 },
      { x: 670, y: 200, key: "star1", value: 15 },
      { x: 700, y: 355, key: "star2", value: 25 },
      { x: 220, y: 195, key: "star2", value: 30 }
    ];

    items.forEach((item) => {
      const star = this.collectibles.create(item.x, item.y, item.key);
      star.setScale(item.key === "star1" ? 0.10 : 0.09);
      star.setBounce(0.15);
      star.body.setGravityY(Phaser.Math.Between(25, 75));
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

    this.livesText = this.add.text(18, 76, `Lives: ${this.lives}`, {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    });

    this.timerText = this.add.text(18, 106, "Time: 0.0", {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5
    });

    this.messageText = this.add.text(400, 300, "Collect both stars!", {
      fontSize: "28px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
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
      this.levelComplete();
    }
  }

  handleHazardPlatformHit(hazard) {
    if (!hazard.active) return;
    if (hazard.y > 500) {
      this.resetFallingObject(hazard);
    }
  }

  resetFallingObject(hazard) {
    hazard.enableBody(
      true,
      Phaser.Math.Between(50, 750),
      Phaser.Math.Between(-260, -60),
      true,
      true
    );
    hazard.setVelocityX(Phaser.Math.Between(-25, 25));
    hazard.setVelocityY(0);
    hazard.setAngularVelocity(Phaser.Math.Between(-80, 80));
    hazard.body.setGravityY(Phaser.Math.Between(180, 250));
  }

  damagePlayer() {
    this.lives -= 1;
    this.livesText.setText(`Lives: ${this.lives}`);

    this.isInvincible = true;
    this.player.setTint(0xff6666);

    this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: 120,
      yoyo: true,
      repeat: 7,
      onComplete: () => {
        this.player.clearTint();
        this.player.setAlpha(1);
      }
    });

    this.player.setVelocity(0, -220);
    this.player.x = 100;
    this.player.y = 455;

    this.time.delayedCall(1200, () => {
      this.isInvincible = false;
    });
  }

  hitDanger() {
    if (this.gameOverFlag || this.isInvincible) return;

    this.damagePlayer();

    if (this.lives <= 0) {
      this.gameOverFlag = true;
      this.physics.pause();
      this.messageText.setText("Game Over\nClick to Restart");

      this.input.once("pointerdown", () => {
        this.scene.restart({ score: 0, level: 1, lives: 3 });
      });
    }
  }

  levelComplete() {
    this.physics.pause();
    this.messageText.setText("Level Complete!");

    this.time.delayedCall(1200, () => {
      this.scene.restart({
        score: this.score,
        level: this.level + 1,
        lives: this.lives
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

    if (this.runner.y > 650) {
      this.runner.setPosition(Phaser.Math.Between(120, 680), -40);
      this.runner.setVelocityX(
        Phaser.Math.Between(0, 1) === 0
          ? -(85 + this.level * 8)
          : (85 + this.level * 8)
      );
      this.runner.setVelocityY(0);
    } else {
      if (this.runner.body.blocked.left) {
        this.runner.setVelocityX(85 + this.level * 8);
      } else if (this.runner.body.blocked.right) {
        this.runner.setVelocityX(-(85 + this.level * 8));
      }
    }

    if (this.flyer.x <= 100) {
      this.flyer.setVelocityX(70);
      this.flyer.flipX = false;
    } else if (this.flyer.x >= 700) {
      this.flyer.setVelocityX(-70);
      this.flyer.flipX = true;
    }

    this.flyer.y = this.flyer.startY + Math.sin(time / 350) * 20;

    this.hazards.children.each((hazard) => {
      if (hazard && hazard.active && hazard.y > 640) {
        this.resetFallingObject(hazard);
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
