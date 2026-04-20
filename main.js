class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.level = 1;
  }

  preload() {
    // --- Load your images ---
    this.load.image("bg", "background.jpg"); // nebula
    this.load.image("starsheet", "stars.png"); // yellow stars + planets
    this.load.spritesheet("player", "astronaut.png", {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet("alien", "alien.png", {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.image("spike", "spike.png");
    this.load.image("platform", "platform.png");
  }

  create() {
    const { width, height } = this.scale;

    // --- Background ---
    this.add.image(width / 2, height / 2, "bg").setScale(1.2);

    // --- Platforms ---
    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(width / 2, height - 40, "platform").setScale(3).refreshBody();
    this.platforms.create(200, 400, "platform");
    this.platforms.create(600, 300, "platform");

    // --- Player ---
    this.player = this.physics.add.sprite(100, 450, "player");
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(true);

    // Player animations
    this.anims.create({
      key: "walk",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    // --- Alien Enemy ---
    this.enemy = this.physics.add.sprite(500, 450, "alien");
    this.enemy.setBounce(0.2);
    this.enemy.setCollideWorldBounds(true);

    this.anims.create({
      key: "alienWalk",
      frames: this.anims.generateFrameNumbers("alien", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    this.enemy.play("alienWalk");

    // --- Stars (Collectibles) ---
    this.stars = this.physics.add.group();

    for (let i = 0; i < 8; i++) {
      let star = this.stars.create(
        Phaser.Math.Between(50, width - 50),
        Phaser.Math.Between(0, 200),
        "starsheet"
      );

      // Individual gravity
      star.body.setGravityY(Phaser.Math.Between(50, 200));
      star.setBounce(0.5);
    }

    // --- Spikes (Hazards) ---
    this.spikes = this.physics.add.staticGroup();
    this.spikes.create(400, 560, "spike");
    this.spikes.create(700, 560, "spike");

    // --- Score + Level ---
    this.score = 0;
    this.scoreText = this.add.text(20, 20, "Score: 0", {
      fontSize: "24px",
      fill: "#fff"
    });

    this.levelText = this.add.text(20, 50, "Level: 1", {
      fontSize: "24px",
      fill: "#fff"
    });

    // --- Input ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // --- Collisions ---
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemy, this.platforms);
    this.physics.add.collider(this.stars, this.platforms);

    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.collider(this.player, this.spikes, this.hitSpike, null, this);
    this.physics.add.collider(this.player, this.enemy, this.hitSpike, null, this);
  }

  update() {
    const speed = 200;

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.play("walk", true);
      this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.play("walk", true);
      this.player.flipX = false;
    } else {
      this.player.setVelocityX(0);
      this.player.stop();
    }

    // Spacebar jump ONLY
    if (this.spaceKey.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-350);
    }
  }

  collectStar(player, star) {
    star.disableBody(true, true);
    this.score += 10;
    this.scoreText.setText("Score: " + this.score);

    // Level complete?
    if (this.stars.countActive(true) === 0) {
      this.nextLevel();
    }
  }

  hitSpike() {
    this.player.setTint(0xff0000);
    this.time.delayedCall(500, () => {
      this.scene.restart();
    });
  }

  nextLevel() {
    this.level++;
    this.levelText.setText("Level: " + this.level);

    // Respawn stars with more gravity
    this.stars.children.iterate((star) => {
      star.enableBody(true, Phaser.Math.Between(50, 750), 0, true, true);
      star.body.setGravityY(Phaser.Math.Between(100, 300) * this.level);
    });

    // Enemy gets faster
    this.enemy.setVelocityX(100 * this.level);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: MainScene
};

new Phaser.Game(config);
