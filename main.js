/* 
Features implemented:
1. Spacebar jump
2. Individual star gravity
3. New player sprite
4. Spikes hazard
5. More platforms / level layout
6. Enemies to avoid
7. Timer
8. Different collectible values
*/

const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  parent: "game",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 650 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let spaceKey;
let platforms;
let stars;
let enemies;
let spikes;

let score = 0;
let scoreText;
let timerText;
let levelText;

let startTime;
let timerRunning = true;
let level = 1;

function preload() {
  this.load.image("background", "assets/background.png");
  this.load.image("player", "assets/astronaut.png");
  this.load.image("platform", "assets/platform.png");
  this.load.image("star1", "assets/star1.png");
  this.load.image("star2", "assets/star2.png");
  this.load.image("spikes", "assets/spikes.png");
  this.load.image("alien1", "assets/alien1.png");
  this.load.image("alien2", "assets/alien2.png");
}

function create() {
  score = 0;
  timerRunning = true;
  startTime = this.time.now;

  this.add.image(450, 300, "background")
    .setDisplaySize(900, 600);

  platforms = this.physics.add.staticGroup();

  createPlatforms(this);
  createSpikes(this);
  createPlayer(this);
  createStars(this);
  createEnemies(this);

  scoreText = this.add.text(20, 20, "Score: 0", {
    fontSize: "24px",
    fill: "#ffffff",
    fontFamily: "Arial"
  });

  timerText = this.add.text(20, 50, "Time: 0.0", {
    fontSize: "22px",
    fill: "#ffffff",
    fontFamily: "Arial"
  });

  levelText = this.add.text(20, 78, "Level: " + level, {
    fontSize: "22px",
    fill: "#ffffff",
    fontFamily: "Arial"
  });

  cursors = this.input.keyboard.createCursorKeys();
  spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  this.physics.add.collider(player, platforms);
  this.physics.add.collider(stars, platforms);
  this.physics.add.collider(enemies, platforms);

  this.physics.add.overlap(player, stars, collectStar, null, this);
  this.physics.add.overlap(player, spikes, hitHazard, null, this);
  this.physics.add.overlap(player, enemies, hitHazard, null, this);
}

function update() {
  if (!player || !player.body) return;

  if (timerRunning) {
    const elapsed = (this.time.now - startTime) / 1000;
    timerText.setText("Time: " + elapsed.toFixed(1));
  }

  player.setVelocityX(0);

  if (cursors.left.isDown) {
    player.setVelocityX(-260);
    player.flipX = true;
  } else if (cursors.right.isDown) {
    player.setVelocityX(260);
    player.flipX = false;
  }

  if (Phaser.Input.Keyboard.JustDown(spaceKey) && player.body.touching.down) {
    player.setVelocityY(-500);
  }

  enemies.children.iterate(enemy => {
    if (!enemy) return;

    if (enemy.x <= 60) {
      enemy.setVelocityX(90 + level * 15);
      enemy.flipX = false;
    }

    if (enemy.x >= 840) {
      enemy.setVelocityX(-90 - level * 15);
      enemy.flipX = true;
    }
  });

  if (player.y > 650) {
    restartLevel(this);
  }
}

function createPlatforms(scene) {
  platforms.clear(true, true);

  const platformData = [
    { x: 450, y: 575, w: 950 },
    { x: 160, y: 465, w: 230 },
    { x: 450, y: 385, w: 230 },
    { x: 740, y: 305, w: 230 },
    { x: 450, y: 225, w: 230 },
    { x: 170, y: 145, w: 230 }
  ];

  platformData.forEach(data => {
    const platform = platforms.create(data.x, data.y, "platform");
    platform.setDisplaySize(data.w, 45);
    platform.refreshBody();
  });
}

function createPlayer(scene) {
  player = scene.physics.add.sprite(80, 500, "player");

  player.setDisplaySize(55, 70);
  player.setCollideWorldBounds(true);
  player.setBounce(0.05);
  player.body.setSize(40, 58);
  player.body.setOffset(8, 8);
}

function createStars(scene) {
  stars = scene.physics.add.group();

  const starPositions = [
    { x: 160, y: 60, type: "star1", value: 10 },
    { x: 450, y: 60, type: "star2", value: 25 },
    { x: 740, y: 60, type: "star1", value: 10 },
    { x: 450, y: 120, type: "star1", value: 10 },
    { x: 170, y: 80, type: "star2", value: 25 }
  ];

  starPositions.forEach((data, index) => {
    const star = stars.create(data.x, data.y, data.type);

    if (data.type === "star2") {
      star.setDisplaySize(34, 34);
    } else {
      star.setDisplaySize(32, 32);
    }

    star.value = data.value;
    star.setBounceY(0.15);
    star.setCollideWorldBounds(true);

    star.body.setGravityY(100 + index * 90);
  });
}

function createSpikes(scene) {
  spikes = scene.physics.add.staticGroup();

  for (let x = 80; x <= 820; x += 95) {
    const spike = spikes.create(x, 545, "spikes");
    spike.setDisplaySize(58, 42);
    spike.refreshBody();

    spike.body.setSize(45, 30);
    spike.body.setOffset(7, 10);
  }
}

function createEnemies(scene) {
  enemies = scene.physics.add.group();

  const alienOne = enemies.create(720, 250, "alien1");
  alienOne.setDisplaySize(75, 55);
  alienOne.setVelocityX(-100);
  alienOne.setBounce(1);
  alienOne.setCollideWorldBounds(true);
  alienOne.body.setSize(60, 40);

  const alienTwo = enemies.create(430, 330, "alien2");
  alienTwo.setDisplaySize(60, 85);
  alienTwo.setVelocityX(120);
  alienTwo.setBounce(1);
  alienTwo.setCollideWorldBounds(true);
  alienTwo.body.setSize(42, 65);
}

function collectStar(player, star) {
  score += star.value;
  scoreText.setText("Score: " + score);

  star.disableBody(true, true);

  if (stars.countActive(true) === 0) {
    timerRunning = false;

    this.time.delayedCall(900, () => {
      level++;
      this.scene.restart();
    });
  }
}

function hitHazard(player, hazard) {
  restartLevel(this);
}

function restartLevel(scene) {
  score = 0;
  scene.scene.restart();
}
