function showErrorOverlay(msg) {
  let el = document.getElementById('errorOverlay');
  if (!el) return;
  el.style.display = 'block';
  const time = new Date().toLocaleTimeString();
  el.innerText = `[${time}] ${msg}\n\n` + el.innerText;
}

// Global window error handler to surface runtime errors
window.addEventListener('error', (e) => {
  showErrorOverlay(`Runtime error: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`);
});
window.addEventListener('unhandledrejection', (ev) => {
  showErrorOverlay(`Unhandled promise rejection: ${ev.reason}`);
});

class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  preload() {
    // load background for menu
    this.load.image('bg', 'assets/background.png');
    // show loading errors in console if any file fails
    this.load.on('loaderror', (file) => {
      showErrorOverlay(`Failed to load: ${file.key} -> ${file.src}`);
    });
  }
  create() {
    const { width, height } = this.scale;
    this.add.image(width/2, height/2, 'bg').setScale(1.2);
    this.add.rectangle(width/2, height/2, 560, 260, 0x000000, 0.55).setStrokeStyle(4, 0x8b5cf6);
    this.add.text(width/2, height/2 - 40, 'Astronaut Luna Moon', { fontSize:'36px', fill:'#fff' }).setOrigin(0.5);
    this.add.text(width/2, height/2 + 10, 'Press ENTER to Start', { fontSize:'20px', fill:'#fff' }).setOrigin(0.5);
    this.add.text(width/2, height/2 + 50, 'Move: ← →   Jump: SPACE', { fontSize:'16px', fill:'#ddd' }).setOrigin(0.5);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }
  update() {
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start('MainScene', { level:1, lives:5 });
    }
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
    this.level = 1;
    this.lives = 5;
  }

  preload() {
    // All assets are PNGs in assets/ folder (case-sensitive)
    this.load.image('bg', 'assets/background.png');
    this.load.image('platform', 'assets/floating_island.png');
    this.load.image('star', 'assets/star_happy.png');
    this.load.image('spike', 'assets/spike.png');
    this.load.image('playerImg', 'assets/astronaut.png');
    this.load.image('enemyImg', 'assets/jetray.png');

    // show load errors
    this.load.on('loaderror', (file) => {
      showErrorOverlay(`Failed to load asset: ${file.key} -> ${file.src}`);
    });
  }

  create(data) {
    // accept initial data from menu
    if (data && data.level) this.level = data.level;
    if (data && data.lives) this.lives = data.lives;

    const { width, height } = this.scale;

    // background
    this.add.image(width/2, height/2, 'bg').setScale(1.2);

    // world gravity tweak (global star feel)
    this.physics.world.gravity.y = 350 + (this.level - 1) * 20;

    // platforms (more platforms for level design)
    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(width/2, height - 40, 'platform').setScale(3).refreshBody();
    this.platforms.create(200, 420, 'platform').setScale(0.9).refreshBody();
    this.platforms.create(600, 320, 'platform').setScale(0.9).refreshBody();
    this.platforms.create(400, 220, 'platform').setScale(0.8).refreshBody();
    this.platforms.create(100, 260, 'platform').setScale(0.7).refreshBody();
    this.platforms.create(700, 200, 'platform').setScale(0.7).refreshBody();

    // player (image sprite to avoid spritesheet mismatch)
    this.player = this.physics.add.sprite(100, 450, 'playerImg').setScale(0.6);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);

    // enemy (image sprite)
    this.enemy = this.physics.add.sprite(600, 450, 'enemyImg').setScale(0.6);
    this.enemy.setCollideWorldBounds(true);
    this.enemy.setVelocityX(80 + (this.level - 1) * 20);
    this.enemy.setBounce(1, 0);

    // stars group
    this.stars = this.physics.add.group();
    this.spawnStarsForLevel(this.level);

    // spikes hazards
    this.spikes = this.physics.add.staticGroup();
    const spikeSpacing = width / 6;
    for (let i = 1; i <= 5; i++) {
      const spike = this.spikes.create(i * spikeSpacing, height - 60, 'spike').setScale(0.5).refreshBody();
      spike.setOrigin(0.5, 1);
    }

    // UI
    this.score = 0;
    this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize:'24px', fill:'#fff' });
    this.livesText = this.add.text(20, 50, 'Lives: ' + this.lives, { fontSize:'24px', fill:'#fff' });
    this.levelText = this.add.text(20, 80, 'Level: ' + this.level, { fontSize:'20px', fill:'#fff' });

    // timer
    this.levelStartTime = this.time.now;
    this.timerText = this.add.text(600, 20, 'Time: 0.0s', { fontSize:'20px', fill:'#fff' });

    // input: spacebar jump (Up arrow no longer jumps)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemy, this.platforms);
    this.physics.add.collider(this.stars, this.platforms);

    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.collider(this.player, this.spikes, this.hitHazard, null, this);
    this.physics.add.collider(this.player, this.enemy, this.hitHazard, null, this);

    // enemy world bounds bounce handler
    this.enemy.body.onWorldBounds = true;
    this.enemy.body.world.on('worldbounds', (body) => {
      if (body.gameObject === this.enemy) {
        this.enemy.setVelocityX(-this.enemy.body.velocity.x);
        this.enemy.toggleFlipX();
      }
    });

    this.lastHitTime = 0;
  }

  update(time) {
    const speed = 220;

    // horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    // spacebar jump only when touching ground
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.player.body.touching.down) {
      this.player.setVelocityY(-380);
    }

    // enemy simple patrol bounds
    if (this.enemy.x > 750) {
      this.enemy.setVelocityX(-80 - (this.level - 1) * 20);
      this.enemy.setFlipX(true);
    } else if (this.enemy.x < 450) {
      this.enemy.setVelocityX(80 + (this.level - 1) * 20);
      this.enemy.setFlipX(false);
    }

    // update timer
    const elapsed = (time - this.levelStartTime) / 1000;
    this.timerText.setText('Time: ' + elapsed.toFixed(1) + 's');
  }

  collectStar(player, star) {
    // different collectible values
    let value = 10;
    if (star.getData('big')) value = 25;

    star.disableBody(true, true);
    this.score += value;
    this.scoreText.setText('Score: ' + this.score);

    // if all stars collected, advance level
    if (this.stars.countActive(true) === 0) {
      const levelTime = (this.time.now - this.levelStartTime) / 1000;
      // freeze timer visually briefly then advance
      this.time.delayedCall(600, () => {
        this.level++;
        this.levelText.setText('Level: ' + this.level);
        // increase difficulty
        this.enemy.setVelocityX((this.enemy.body.velocity.x > 0 ? 1 : -1) * (80 + (this.level - 1) * 20));
        this.spawnStarsForLevel(this.level);
        this.levelStartTime = this.time.now;
      });
    }
  }

  hitHazard(player, hazard) {
    const now = this.time.now;
    if (now - this.lastHitTime < 800) return;
    this.lastHitTime = now;

    this.lives--;
    this.livesText.setText('Lives: ' + this.lives);
    this.player.setTint(0xff0000);
    this.player.setVelocityY(-200);

    this.time.delayedCall(500, () => {
      this.player.clearTint();
      if (this.lives <= 0) {
        // return to menu and reset
        this.scene.start('MenuScene');
      } else {
        this.player.setPosition(100, 450);
      }
    });
  }

  spawnStarsForLevel(level) {
    // clear existing stars
    if (this.stars) this.stars.clear(true, true);

    // base positions + extras for higher levels
    const basePositions = [
      { x:200, y:350 },
      { x:600, y:250 },
      { x:400, y:150 }
    ];
    const extra = Math.min(level - 1, 6);
    for (let i = 0; i < extra; i++) {
      basePositions.push({ x:80 + i * 110, y:120 + (i % 3) * 60 });
    }

    basePositions.forEach((pos) => {
      const star = this.stars.create(pos.x, pos.y, 'star');
      const isBig = Math.random() < 0.25;
      star.setScale(isBig ? 0.9 : 0.5);
      star.setData('big', isBig);

      // individual gravity per star (randomized)
      const gravityY = Phaser.Math.Between(80 + level * 5, 220 + level * 10);
      // ensure body exists
      if (star.body) {
        star.body.setGravityY(gravityY);
      }

      star.setBounce(0.4 + Math.random() * 0.4);
      star.setCollideWorldBounds(true);
    });

    // global tweak for stars based on level
    this.stars.children.iterate((s) => {
      if (s && s.body) {
        s.body.setGravityY(s.body.gravity.y * (1 + (level - 1) * 0.04));
      }
    });
  }
}

// Game config
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 350 }, debug: false }
  },
  scene: [ MenuScene, MainScene ]
};

// Start game after window load
window.addEventListener('load', () => {
  try {
    new Phaser.Game(config);
  } catch (err) {
    showErrorOverlay('Failed to start Phaser: ' + err.message);
    console.error(err);
  }
});

