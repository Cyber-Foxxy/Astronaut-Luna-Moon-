// Implemented features for Homework 14:
// 1) Spacebar jump
// 2) Individual star gravity
// 3) New player sprite (astronaut)
// 4) Spikes hazard
// 5) More platforms (level design)
// 6) Level system + display

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.level = 1;
  }

  preload() {
    // --- Your art assets (rename to match your actual files) ---
    // 1) Background: nebula space image
    this.load.image("bg", "background.jpg");

    // 2) Stars / planets sheet (can be a single image; we use it as a sprite)
    this.load.image("star", "stars.png");

    // 3) Astronaut sprite sheet (8 poses in a grid)
    this.load.spritesheet("player", "astronaut.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    // 4) Alien enemy sprite sheet
    this.load.spritesheet("alien", "alien.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    // 5) Spike / hazard image (cropped from your spikes/gears sheet)
    this.load.image("spike", "spike.png");

    // Create a simple platform texture so you don’t need a separate file
    const g = this.add.graphics();
    g.fillStyle(0x888888, 1);
    g.fillRect(0, 0, 200, 32);
    g.generateTexture("platform", 200, 32);
    g.destroy();
  }

  create() {
    const { width, height } = this.scale;

    // --- Background ---
    this.add.image(width / 2, height / 2, "bg").setScale(1.2);

    // --- Platforms (Level Design) ---
    this.platforms = this.physics.add.staticGroup();

    // Ground
    this.platforms
      .create(width / 2, height - 20, "platform")
      .setScale(3, 1)
      .refreshBody();

    // Floating platforms at different heights
    this.platforms.create(180, 430, "platform");
    this.platforms.create(620, 340, "platform");
    this.platforms.create(400, 250, "platform");

    // --- Player (Astronaut) ---
    this.player = this.physics.add.sprite(100, 400, "player");
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.7); // keep astronaut proportionate

    this.anims.create({
      key: "playerWalk",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    // --- Alien Enemy ---
    this.enemy = this.physics.add.sprite(600, 400, "alien");
    this.enemy.setBounce(0.2);
    this.enemy.setCollideWorldBounds(true);
    this.enemy.setScale(0.7);

    this.anims.create({
      key: "alienWalk",
      frames: this.anims.generateFrameNumbers("alien", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    this.enemy.play("alienWalk");
    this.enemy.setVelocityX(80); // simple patrol feel

    // --- Stars (Collectibles) with Individual Gravity ---
    this.stars = this.physics.add.group();

    for (let i = 0; i < 8; i++) {
      const star = this.stars.create(
        Phaser.Math.Between(50, width - 50),
        Phaser.Math.Between(0, 150),
        "star"
      );
      star.setScale(0.4); // keep stars smaller than player
      star.setBounce(0.5);
      // Individual gravity per star
      star.body.setGravityY(Phaser.Math.Between(80, 220));
    }

    // --- Spikes (Hazards) ---
    this.spikes = this.physics.add.staticGroup();
    const spike1 = this.spikes.create(350, height - 40, "spike");
    const spike2 = this.spikes.create(750, height - 40, "spike");

    spike1.setScale(0.5).refreshBody();
    spike2.setScale(0.5).refreshBody();

    // --- Score + Level UI ---
    this.score = 0;
    this.scoreText = this.add.text(20, 20, "Score: 0", {
      fontSize: "24px",
      fill: "#ffffff"
    });

    this.levelText = this.add.text(20, 50, "Level: 1", {
      fontSize: "24px",
      fill: "#ffffff"
    });

    // --- Input ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // --- Physics Colliders / Overlaps ---
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemy, this.platforms);
    this.physics.add.collider(this.stars, this.platforms);

    this.physics.add.overlap(
      this.player,
      this.stars,
      this.collectStar,
      null,
      this
    );

    this.physics.add.collider(
      this.player,
      this.spikes,
      this.hitHazard,
      null,
      this
    );

    this.physics.add.collider(
      this.player,
      this.enemy,
      this.hitHazard,
      null,
      this
    );
  }

  update() {
    const speed = 220;

    // --- Player horizontal movement ---
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.play("playerWalk", true);
      this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.play("playerWalk", true);
      this.player.flipX = false;
    } else {
      this.player.setVelocityX(0);
      this.player.anims.stop();
    }

    // --- Spacebar jump ONLY (no up arrow) ---
    if (this.spaceKey.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-380);
    }

    // Simple enemy back-and-forth
    if (this.enemy.x > 750) {
      this.enemy.setVelocityX(-80);
      this.enemy.flipX = true;
    } else if (this.enemy.x < 450) {
      this.enemy.setVelocityX(80);
      this.enemy.flipX = false;
    }
  }

  collectStar(player, star) {
    star.disableBody(true, true);
    this.score += 10;
    this.scoreText.setText("Score: " + this.score);

    // When all stars are collected, go to next level
    if (this.stars.countActive(true) === 0) {
      this.nextLevel();
    }
  }

  hitHazard() {
    // Clear consequence: flash red, then restart
    this.player.setTint(0xff0000);
    this.player.setVelocity(0, 0);

    this.time.delayedCall(500, () => {
      this.scene.restart();
    });
  }

  nextLevel() {
    this.level++;
    this.levelText.setText("Level: " + this.level);

    // Respawn stars with stronger gravity each level
    this.stars.children.iterate((star) => {
      star.enableBody(
        true,
        Phaser.Math.Between(50, this.scale.width - 50),
        Phaser.Math.Between(0, 150),
        true,
        true
      );
      star.body.setGravityY(
        Phaser.Math.Between(100, 250) * (1 + (this.level - 1) * 0.3)
      );
    });

    // Slightly increase enemy speed each level
    const newSpeed = 80 + (this.level - 1) * 20;
    this.enemy.setVelocityX(newSpeed);
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
      gravity: { y: 350 }, // global gravity (player/enemy); stars have their own extra gravity
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
