
function GameBoard(options){
    this.canvasId = "canvas";
    this.scoreId = "score";

    this.canvasWidth = 300;
    this.canvasHeight = 300;
    this.width = 10; //cells
    this.height = 10; //cells
    this.board = [];

    this.food = 1;
    this.empty = 2;
    this.agent = 4;
    this.poison = 3;

    this.foodPoisonRatio = 0.5;
    this.density = 0.1;

    this.score = {};
    this.score[this.food] = 0;
    this.score[this.poison] = 0;
    this.score[this.empty] = 0;

    this.canvasContext = undefined;

    this.colorDictionary = {};
    this.colorDictionary[this.food] = 'green';
    this.colorDictionary[this.empty] = 'white';
    this.colorDictionary[this.poison] = 'gray';
    this.colorDictionary[this.agent] = 'black';

    this.rewardDictionary = {};
    this.rewardDictionary[this.food] = 1;
    this.rewardDictionary[this.empty] = 0;
    this.rewardDictionary[this.poison] = -1;
    this.agentPosition = {
        line: this.height-1,
        column: ~~(this.width/2)
    };
    _.extend(this, options || {});
    this.init();
}

GameBoard.prototype.init = function(){
    this.board = []; //the representation of the world
    for (var column = 0; column < this.width; column++){
        this.board.push([]);
        for (var line = 0; line < this.height; line++){
            this.board[column].push(this.empty);
        }
    }
    var canvas = document.getElementById(this.canvasId);
    this.canvasContext = canvas.getContext('2d');
};

GameBoard.prototype.resetScore = function(){
    var score = this.score;
    _.each(this.score, function(v, k){
         score[k] = 0;
    });
};
GameBoard.prototype.setPosition = function(column){
    //set agents position
    column = (column + this.width) % this.width; //circular world
    this.agentPosition.column = column;
    this.board[column][this.agentPosition.line] = this.agent;
};

GameBoard.prototype.addMoreObjects = function(){
    //insert more food and poison
    for (var column = 0; column < this.width; column++){
        if (Math.random()<this.density){
            this.board[column][0] = Math.random() < this.foodPoisonRatio ? this.food : this.poison;
        } else {
            this.board[column][0] = this.empty;
        }
    }
    this.setPosition(this.agentPosition.column);
};

GameBoard.prototype.moveObjectsDown = function(){
    //advance objects position 1 cell down
    for (var line = this.height - 1; line > 0; line--){
        for (var column = 0; column < this.width; column++){
            this.board[column][line] = this.board[column][line-1];
        }
    }
};

GameBoard.prototype.currentState = function(){
    //get an object representing food, poison or empty cell in the 3 squares in front of agent
    var state = {};
    var line, column;
    for (var dcol = -1; dcol <= 1 ; dcol++){
        for (var dline = -1; dline < 0 ; dline++){
            line = (this.agentPosition.line + dline + this.height) % this.height;
            column = (this.agentPosition.column + dcol + this.width) % this.width;
            state[dcol + "," + dline] = this.board[column][line];
        }
    }
    return state;
};

GameBoard.prototype.objectAt = function(column, line){
    return this.board[column][line];
};

GameBoard.prototype.randomAction = function(){
    //actions are -1,0,+1
    return ~~(Math.random() * 3) - 1;
};

GameBoard.prototype.draw = function(){
    var dx = this.canvasWidth/this.width;
    var dy = this.canvasHeight/this.height;
    var radius = Math.min(dx, dy)/2.5;
    var pi2 = Math.PI * 2;
    var context = this.canvasContext;
    context.clearRect ( 0 , 0 , this.canvasWidth , this.canvasHeight);

    for (var line = 0; line < this.height; line++){
        for (var column = 0; column < this.width; column++){
            if (this.board[column][line]===this.empty) continue;
            context.beginPath();
            context.arc(dx * (column + 0.5), dy * (line + 0.5), this.board[column][line]!==this.agent ? radius : radius*1.2, 0, pi2, false);
            context.fillStyle = this.colorDictionary[this.board[column][line]];
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = '#333333';
            context.stroke();
        }
    }
};

var game = new GameBoard({density: 0.5});
var net = new brain.NeuralNetwork();

function brainBestAction(state){
    //the best action given by the network
    var input = _.clone(state);
    //for each possible action return the one with maximum reward
    return _.max([-1,0,1], function(act){
        input.action = act;
        return net.transcode(input).r;
    });
}

var sid; //set interval id
function stop(){
    game.resetScore();
    clearInterval(sid);
}

function trainAndRun(){
    stop();
    console.log("collecting data");
    for (var i = 0; i < 10000; i++){
        exploreOnce(game);
    }
    console.log("training network");
    net.normalize();
    net.train(net.list);
    console.log("running");
    sid = setInterval(runOnce, 500);
}

function withoutBrains(){
    stop();
    sid = setInterval(randomWalk, 500);
}

function exploreOnce(game){

    var input = game.currentState();

    var action = game.randomAction();
    //extend with the action
    input.action = action;
    //apply the action
    game.setPosition(game.agentPosition.column + action);
    //get next state, compute reward
    game.moveObjectsDown();
    var collidedWith = game.objectAt(game.agentPosition.column, game.agentPosition.line);
    var reward = game.rewardDictionary[collidedWith];

    var output = {r: reward};

    net.addUniqueTrainingCase(input, output);

    game.addMoreObjects();
}

function runOnce(){
    //memorize current state
    var currentState = game.currentState();

    var action = brainBestAction(currentState);

    game.setPosition(game.agentPosition.column + action);
    //get next state, compute reward
    game.moveObjectsDown();
    var collidedWith = game.objectAt(game.agentPosition.column, game.agentPosition.line);

    game.addMoreObjects();

    //some feedback on performance
    game.score[collidedWith]++;
    var summary = "<br /><span style='color: green;'>with brain.js</span>";
    summary += "<br />green==food: " + game.score[game.food];
    summary += "<br />gray=poison: " + game.score[game.poison];
    summary += "<br />poison/food: " + Math.round(100*game.score[game.poison]/(game.score[game.food]||1)) + "%";
    document.getElementById(game.scoreId).innerHTML = summary;
    game.draw();
}

function randomWalk(){
    //memorize current state
    var action = game.randomAction();
    game.setPosition(game.agentPosition.column + action);
    game.moveObjectsDown();
    var collidedWith = game.objectAt(game.agentPosition.column, game.agentPosition.line);
    game.addMoreObjects();
    game.score[collidedWith]++;
    var summary = "<br /><span style='color: red;'>without brains</span>";
    summary += "<br />green==food: " + game.score[game.food];
    summary += "<br />gray=poison: " + game.score[game.poison];
    summary += "<br />poison/food: " + Math.round(100*game.score[game.poison]/(game.score[game.food]||1)) + "%";
    document.getElementById(game.scoreId).innerHTML = summary;
    game.draw();
}

withoutBrains();







