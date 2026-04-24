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

const SAFE_START_X = 90;
const SAFE_START_Y = 500;

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

  this.add.image(450, 300, "background").setDisplaySize(900, 600);

  platforms = this.physics.add.staticGroup();
  spikes = this.physics.add.staticGroup();
  stars = this.physics.add.group();
  enemies = this.physics.add.group();

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

  if (Phaser.Input.Keyboard.JustDown(spaceKey) && player.body.blocked.down) {
    player.setVelocityY(-500);
  }

  enemies.children.iterate(enemy => {
    if (!enemy) return;

    if (enemy.x <= 60) {
      enemy.setVelocityX(100 + level * 15);
      enemy.flipX = false;
    }

    if (enemy.x >= 840) {
      enemy.setVelocityX(-100 - level * 15);
      enemy.flipX = true;
    }
  });

  if (player.y > 650) {
    playerDeath(this);
  }
}

function createPlatforms(scene) {
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
  player = scene.physics.add.sprite(SAFE_START_X, SAFE_START_Y, "player");

  player.setDisplaySize(50, 65);
  player.setCollideWorldBounds(true);
  player.setBounce(0.05);

  player.body.setSize(36, 52);
  player.body.setOffset(10, 10);
}

function createSpikes(scene) {
  /*
    Spikes are placed slightly ABOVE the bottom platform,
    but not near the safe spawn point.
    This prevents instant reset when the level starts.
  */

  for (let x = 220; x <= 830; x += 95) {
    const spike = spikes.create(x, 535, "spikes");

    spike.setDisplaySize(50, 36);
    spike.refreshBody();

    spike.body.setSize(38, 22);
    spike.body.setOffset(6, 14);
  }
}

function createStars(scene) {
  const starPositions = [
    { x: 160, y: 60, type: "star1", value: 10 },
    { x: 450, y: 60, type: "star2", value: 25 },
    { x: 740, y: 60, type: "star1", value: 10 },
    { x: 450, y: 120, type: "star1", value: 10 },
    { x: 170, y: 80, type: "star2", value: 25 }
  ];

  starPositions.forEach((data, index) => {
    const star = stars.create(data.x, data.y, data.type);

    star.setDisplaySize(30, 30);
    star.value = data.value;

    star.setBounceY(0.15);
    star.setCollideWorldBounds(true);
    star.body.setGravityY(80 + index * 80);

    star.body.setSize(24, 24);
    star.body.setOffset(3, 3);
  });
}

function createEnemies(scene) {
  const alienOne = enemies.create(720, 250, "alien1");
  alienOne.setDisplaySize(70, 52);
  alienOne.setVelocityX(-100);
  alienOne.setBounce(1);
  alienOne.setCollideWorldBounds(true);
  alienOne.body.setSize(55, 38);
  alienOne.body.setOffset(8, 8);

  const alienTwo = enemies.create(430, 330, "alien2");
  alienTwo.setDisplaySize(55, 78);
  alienTwo.setVelocityX(120);
  alienTwo.setBounce(1);
  alienTwo.setCollideWorldBounds(true);
  alienTwo.body.setSize(38, 58);
  alienTwo.body.setOffset(8, 10);
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
  playerDeath(this);
}

function playerDeath(scene) {
  score = 0;

  player.setVelocity(0, 0);
  player.setPosition(SAFE_START_X, SAFE_START_Y);

  if (player.body) {
    player.body.enable = true;
  }

  scoreText.setText("Score: 0");
}
