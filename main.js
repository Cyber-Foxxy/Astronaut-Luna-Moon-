
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

    // Add background with a check to see if it loaded
    if (this.textures.exists("bg")) {
        const bg = this.add.image(width / 2, height / 2, "bg");
        bg.setDisplaySize(width, height);
    }

    this.add.rectangle(width / 2, height / 2, width, height, 0x120b2f, 0.35);

    this.add.text(width / 2, 110, "Astronaut Luna Moon", {
      fontSize: "42px", color: "#ffffff", stroke: "#000000", strokeThickness: 6
    }).setOrigin(0.5);

    const startButton = this.add.rectangle(width / 2, 430, 250, 70, 0x8b5cf6, 1)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, 430, "START GAME", {
      fontSize: "28px", color: "#ffffff"
    }).setOrigin(0.5);

    startButton.on("pointerdown", () => {
      this.scene.start("MainScene", { score: 0, level: 1 });
    });
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
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
    // Error handling for assets
    this.load.on("loaderror", (file) => {
      console.warn("Could not load asset:", file.key);
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
    this.physics.world.setBounds(0, 0, width, height);

    // Run the transparency logic only if the raw textures exist
    const rawKeys = ["playerRaw", "alienRunnerRaw", "alienFlyerRaw", "platformRaw", "spikeRaw", "starCollectRaw", "starHazardRaw"];
    const finalKeys = ["player", "alienRunner", "alienFlyer", "platform", "spike", "starCollect", "starHazard"];
    
    rawKeys.forEach((rk, index) => {
        if (this.textures.exists(rk)) {
            this.makeTransparentTexture(rk, finalKeys[index]);
        }
    });

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

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.runner, this.platforms);
    this.physics.add.collider(this.collectibles, this.platforms);
    this.physics.add.collider(this.hazards, this.platforms, (h) => { if(h.y > 515) h.destroy(); });

    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
    this.physics.add.overlap(this.player, [this.spikes, this.runner, this.flyer, this.hazards], this.hitDanger, null, this);
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
      if (data[i] > 210 && data[i+1] > 210 && data[i+2] > 210) data[i+3] = 0;
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
    platformData.forEach(p => {
      const plat = this.platforms.create(p.x, p.y, this.textures.exists("platform") ? "platform" : null);
      plat.setScale(p.scaleX, p.scaleY).refreshBody();
    });
  }

  buildSpikes() {
    [{ x: 500, y: 525 }, { x: 610, y: 525 }, { x: 90, y: 525 }].forEach(s => {
      this.spikes.create(s.x, s.y, "spike").setScale(0.28).refreshBody();
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(90, 485, "player");
    this.player.setScale(0.25).setCollideWorldBounds(true);
  }

  createEnemies() {
    this.runner = this.physics.add.sprite(560, 250, "alienRunner").setScale(0.18).setCollideWorldBounds(true).setBounce(1, 0);
    this.runner.setVelocityX(100 + (this.level * 10));
    
    this.flyer = this.physics.add.sprite(300, 165, "alienFlyer").setScale(0.20);
    this.flyer.body.allowGravity = false;
    this.flyer.startY = 165;
    this.flyer.setVelocityX(90);
  }

  createCollectibles() {
    const items = [
      { x: 160, y: 405, key: "starCollect", val: 10 },
      { x: 640, y: 175, key: "starHazard", val: 30 }
    ];
    items.forEach(item => {
      let s = this.collectibles.create(item.x, item.y, item.key);
      s.setScale(0.1).setBounce(0.3);
      s.body.setGravityY(Phaser.Math.Between(50, 100));
      s.value = item.val;
    });
  }

  startHazardSpawner() {
    this.hazardTimer = this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => { if (!this.gameOverFlag) this.spawnHazard(); }
    });
  }

  spawnHazard() {
    const h = this.hazards.create(Phaser.Math.Between(50, 750), -40, "starHazard");
    h.setScale(0.08).setAngularVelocity(100).body.setGravityY(200);
  }

  createUI() {
    this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '20px', fill: '#fff' });
    this.timerText = this.add.text(20, 50, 'Time: 0', { fontSize: '20px', fill: '#fff' });
    this.messageText = this.add.text(400, 300, '', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
  }

  collectItem(player, item) {
    this.score += item.value;
    this.scoreText.setText("Score: " + this.score);
    item.destroy();
    if (this.collectibles.countActive(true) === 0) this.levelComplete();
  }

  hitDanger() {
    if (this.gameOverFlag) return;
    this.gameOverFlag = true;
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.messageText.setText("GAME OVER\nClick to Restart");
    this.input.once("pointerdown", () => this.scene.restart({ score: 0, level: 1 }));
  }

  levelComplete() {
    this.messageText.setText("LEVEL COMPLETE!");
    this.time.delayedCall(1500, () => this.scene.restart({ score: this.score, level: this.level + 1 }));
  }

  update(time, delta) {
    if (this.gameOverFlag) return;
    this.elapsedTime += delta / 1000;
    this.timerText.setText("Time: " + this.elapsedTime.toFixed(1));

    if (this.cursors.left.isDown) {
        this.player.setVelocityX(-200);
        this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(200);
        this.player.flipX = false;
    } else {
        this.player.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.player.body.blocked.down) {
        this.player.setVelocityY(-400);
    }

    // Alien AI
    if (this.runner.body.blocked.left || this.runner.body.blocked.right) {
        this.runner.setVelocityX(this.runner.body.velocity.x * -1);
    }
    if (this.flyer.x < 100 || this.flyer.x > 700) {
        this.flyer.setVelocityX(this.flyer.body.velocity.x * -1);
    }
    this.flyer.y = this.flyer.startY + Math.sin(time / 400) * 30;
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  scale: {
    mode: Phaser.Scale.FIT, 
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 600 }, debug: false }
  },
  scene: [StartScene, MainScene]
};

new Phaser.Game(config);
