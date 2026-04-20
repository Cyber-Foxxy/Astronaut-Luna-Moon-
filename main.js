/*
Features included:
1. Spacebar jump
2. New astronaut player image
3. Two alien enemies to avoid
4. Random falling stars/hazards
5. Rearranged visible platforms
6. Background border
7. Spikes hazard
8. Score system
9. Level progression
10. Restart on game over
*/

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.level = 1;
    this.score = 0;
    this.gameOverFlag = false;
  }

  init(data) {
    this.level = data.level || 1;
    this.score = data.score || 0;
    this.gameOverFlag = false;
  }

  preload() {
    this.load.image("bg", "background(1).jpg");
    this.load.image("player", "astronaut2.avif");
    this.load.image("alienRunner", "alien2.jpg");
    this.load.image("alienFlyer", "alien3.webp");
    this.load.image("platform", "platform.png");
    this.load.image("spikes", "spikes.png");
    this.load.image("starCollect", "star1.png");
    this.load.image("starHazard", "star2.webp");
  }

  create() {
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);

    this.createBackground();
    this.createBorder();

    this.platforms = this.physics.add.staticGroup();
    this.spikeGroup = this.physics.add.staticGroup();
    this.collectibles = this.physics.add.group();
    this.fallingHazards = this.physics.add.group();
    this.enemies = this.physics.add.group();

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
    this.physics.add.collider(this.collectibles, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(
      this.fallingHazards,
      this.platforms,
      this.onHazardHitPlatform,
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

    this.physics.add.overlap(
      this.player,
      this.spikeGroup,
      this.hitDanger,
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.hitDanger,
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.fallingHazards,
      this.hitDanger,
      null,
      this
    );
  }

  createBackground() {
    const { width, height } = this.scale;

    this.bg = this.add.image(width / 2, height / 2, "bg");
    this.bg.setDisplaySize(width, height);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x1b1038, 0.18);
    overlay.fillRect(0, 0, width, height);

    for (let i = 0; i < 35; i++) {
      const x = Phaser.Math.Between(20, width - 20);
      const y = Phaser.Math.Between(20, height - 20);
      const size = Phaser.Math.Between(1, 3);
      overlay.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 0.8));
      overlay.fillCircle(x, y, size);
    }
  }

  createBorder() {
    const { width, height } = this.scale;
    const border = this.add.graphics();

    border.lineStyle(4, 0xffffff, 0.35);
    border.strokeRect(4, 4, width - 8, height - 8);

    border.lineStyle(8, 0x8b5cf6, 0.85);
    border.strokeRect(10, 10, width - 20, height - 20);
  }

  buildPlatforms() {
    const platformData = [
      { x: 400, y: 575, scaleX: 0.42, scaleY: 0.22 }, // ground higher so bottom is visible
      { x: 160, y: 485, scaleX: 0.16, scaleY: 0.14 },
      { x: 355, y: 410, scaleX: 0.16, scaleY: 0.14 },
      { x: 585, y: 330, scaleX: 0.16, scaleY: 0.14 },
      { x: 705, y: 470, scaleX: 0.14, scaleY: 0.14 },
      { x: 235, y: 255, scaleX: 0.14, scaleY: 0.14 },
      { x: 675, y: 205, scaleX: 0.14, scaleY: 0.14 }
    ];

    platformData.forEach((p) => {
      const plat = this.platforms.create(p.x, p.y, "platform");
      plat.setScale(p.scaleX, p.scaleY);
      plat.refreshBody();
    });
  }

  buildSpikes() {
    const spikeData = [
      { x: 520, y: 545 },
      { x: 610, y: 545 },
      { x: 95, y: 545 }
    ];

    spikeData.forEach((s) => {
      const spike = this.spikeGroup.create(s.x, s.y, "spikes");
      spike.setScale(0.18);
      spike.refreshBody();
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(90, 500, "player");
    this.player.setScale(0.14);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);

    this.player.body.setSize(
      this.player.width * 0.38,
      this.player.height * 0.78
    );
    this.player.body.setOffset(
      this.player.width * 0.31,
      this.player.height * 0.12
    );
  }

  createEnemies() {
    const runner = this.physics.add.sprite(610, 120, "alienRunner");
    runner.setScale(0.18);
    runner.setCollideWorldBounds(true);
    runner.setBounce(1, 0);
    runner.setVelocityX(130 + this.level * 15);
    runner.enemyType = "runner";

    runner.body.setSize(runner.width * 0.55, runner.height * 0.65);
    runner.body.setOffset(runner.width * 0.2, runner.height * 0.2);

    const flyer = this.physics.add.sprite(250, 150, "alienFlyer");
    flyer.setScale(0.22);
    flyer.setCollideWorldBounds(true);
    flyer.setAllowGravity(false);
    flyer.setVelocityX(100 + this.level * 15);
    flyer.enemyType = "flyer";
    flyer.startY = flyer.y;

    flyer.body.setSize(flyer.width * 0.5, flyer.height * 0.7);
    flyer.body.setOffset(flyer.width * 0.22, flyer.height * 0.15);

    this.enemies.add(runner);
    this.enemies.add(flyer);

    this.runner = runner;
    this.flyer = flyer;
  }

  createCollectibles() {
    const collectibleData = [
      { x: 140, y: 430, value: 10 },
      { x: 350, y: 355, value: 10 },
      { x: 570, y: 275, value: 10 },
      { x: 705, y: 415, value: 15 },
      { x: 230, y: 195, value: 15 },
      { x: 675, y: 145, value: 20 }
    ];

    collectibleData.forEach((c) => {
      const star = this.collectibles.create(c.x, c.y, "starCollect");
      star.setScale(0.08);
      star.setBounce(0.25);
      star.value = c.value;
      star.body.setGravityY(80);
    });
  }

  startHazards() {
    const startAmount = Phaser.Math.Between(5 + this.level, 8 + this.level);

    for (let i = 0; i < startAmount; i++) {
      this.spawnHazard(true);
    }

    this.hazardTimer = this.time.addEvent({
      delay: Phaser.Math.Between(900, 1400),
      loop: true,
      callback: () => {
        if (!this.gameOverFlag) {
          this.spawnHazard(false);
          this.hazardTimer.delay = Phaser.Math.Between(800, 1300);
        }
      }
    });
  }

  spawnHazard(initial = false) {
    const { width } = this.scale;

    const hazard = this.fallingHazards.create(
      Phaser.Math.Between(40, width - 40),
      initial ? Phaser.Math.Between(-500, -40) : -50,
      "starHazard"
    );

    const randomScale = Phaser.Math.FloatBetween(0.05, 0.09);
    hazard.setScale(randomScale);
    hazard.setBounce(0.15);
    hazard.setVelocityX(Phaser.Math.Between(-40, 40));
    hazard.setAngularVelocity(Phaser.Math.Between(-120, 120));
    hazard.body.setGravityY(Phaser.Math.Between(220, 340) + this.level * 30);
  }

  createUI() {
    this.scoreText = this.add.text(18, 15, `Score: ${this.score}`, {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4
    }).setDepth(20);

    this.levelText = this.add.text(18, 45, `Level: ${this.level}`, {
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4
    }).setDepth(20);

    this.infoText = this.add.text(
      400,
      16,
      "LEFT/RIGHT to move   |   SPACE to jump",
      {
        fontSize: "18px",
        color: "#ffe680",
        stroke: "#000000",
        strokeThickness: 4
      }
    ).setOrigin(0.5, 0).setDepth(20);

    this.messageText = this.add.text(400, 300, "", {
      fontSize: "34px",
      align: "center",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(30);
  }

  collectItem(player, item) {
    this.score += item.value;
    this.scoreText.setText(`Score: ${this.score}`);
    item.destroy();

    if (this.collectibles.countActive(true) === 0) {
      this.levelComplete();
    }
  }

  onHazardHitPlatform(hazard) {
    if (hazard.y > 540) {
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
      this.scene.restart({ level: 1, score: 0 });
    });
  }

  levelComplete() {
    this.physics.pause();
    this.messageText.setText(`Level ${this.level} Complete!`);

    this.time.delayedCall(1300, () => {
      this.scene.restart({
        level: this.level + 1,
        score: this.score
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
        this.runner.setVelocityX(130 + this.level * 15);
      } else if (this.runner.body.blocked.right) {
        this.runner.setVelocityX(-(130 + this.level * 15));
      }
    }

    if (this.flyer) {
      if (this.flyer.x <= 70) {
        this.flyer.setVelocityX(100 + this.level * 15);
        this.flyer.flipX = false;
      } else if (this.flyer.x >= 730) {
        this.flyer.setVelocityX(-(100 + this.level * 15));
        this.flyer.flipX = true;
      }

      this.flyer.y = this.flyer.startY + Math.sin(time / 350) * 25;
    }

    this.fallingHazards.children.each((hazard) => {
      if (hazard && hazard.active && hazard.y > 660) {
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
