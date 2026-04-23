class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.level = 1;
    this.lives = 5;
  }

  preload() {
    this.load.image("bg", "background.jpeg");
    this.load.image("platform", "floating_island.png");
    this.load.image("star", "star_happy.png");
    this.load.image("spike", "spike.png");
    this.load.spritesheet("player", "astronaut.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("alien", "jetray.png", { frameWidth: 128, frameHeight: 128 });
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "bg").setScale(1.2);

    // Platforms
    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(width / 2, height - 40, "platform").setScale(3).refreshBody();
    this.platforms.create(200, 400, "platform");
    this.platforms.create(600, 300, "platform");

    // Player
    this.player = this.physics.add.sprite(100, 450, "player").setScale(0.7);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);

    this.anims.create({
      key: "walk",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    // Aliens
    this.enemy = this.physics.add.sprite(600, 450, "alien").setScale(0.7);
    this.enemy.setCollideWorldBounds(true);
    this.enemy.setVelocityX(80);

    this.anims.create({
      key: "alienWalk",
      frames: this.anims.generateFrameNumbers("alien", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });
    this.enemy.play("alienWalk");

    // Stars (collectibles)
    this.stars = this.physics.add.group();
    const starPositions = [
      { x: 200, y: 350 },
      { x: 600, y: 250 },
      { x: 400, y: 150 }
    ];
    starPositions.forEach(pos => {
      const star = this.stars.create(pos.x, pos.y, "star").setScale(0.5);
      star.body.setGravityY(Phaser.Math.Between(50, 150));
      star.setBounce(0.5);
    });

    // Spikes (hazards)
    this.spikes = this.physics.add.staticGroup();
    const spikeSpacing = width / 6;
    for (let i = 1; i <= 5; i++) {
      this.spikes.create(i * spikeSpacing, height - 60, "spike").setScale(0.5).refreshBody();
    }

    // UI
    this.score = 0;
    this.scoreText = this.add.text(20, 20, "Score: 0", { fontSize: "24px", fill: "#fff" });
    this.livesText = this.add.text(20, 50, "Lives: 5", { fontSize: "24px", fill: "#fff" });

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemy, this.platforms);
    this.physics.add.collider(this.stars, this.platforms);

    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.collider(this.player, this.spikes, this.hitHazard, null, this);
    this.physics.add.collider(this.player, this.enemy, this.hitHazard, null, this);
  }

  update() {
    const speed = 220;

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
      this.player.anims.stop();
    }

    if (this.spaceKey.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-380);
    }

    // Enemy patrol
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
  }

  hitHazard() {
    this.lives--;
    this.livesText.setText("Lives: " + this.lives);
    this.player.setTint(0xff0000);
    this.time.delayedCall(500, () => {
      this.player.clearTint();
      if (this.lives <= 0) {
        this.scene.restart();
        this.lives = 5;
        this.score = 0;
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
    arcade: { gravity: { y: 350 }, debug: false }
  },
  scene: MainScene
};

new Phaser.Game(config);

