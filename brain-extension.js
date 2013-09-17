
function linearTransform(val, minVal, maxVal, minTarget, maxTarget){
    //transforms the interval minVal..maxVal to minTarget..maxTarget
    //y = x * (y1-y0)/(x1-x0) + b; b=y(x=0) with points (x0,y0) x0=minVal x1=maxVal y0=minTarget y1=maxTarget
    try {
        if (maxVal==minVal){
            return minVal;
        }
        var m = (maxTarget-minTarget)/(maxVal-minVal);
        var b = maxTarget - maxVal * m;
        return val * m + b;
    } catch (e){
        return undefined;
    }
}

brain.NeuralNetwork.prototype.addTrainingCase = function(input, output) {
    this.list || (this.list = []);
    this.list.push({
        input: input,
        output: output
    });
    return this.list.length;
};

brain.NeuralNetwork.prototype.addUniqueTrainingCase = function(input, output) {
    this.list || (this.list = []);
    this.uniques || (this.uniques={});
    var key = JSON.stringify(input) + JSON.stringify(output);
    if (this.uniques[key]) {
        return this.list.length;
    } else {
        this.uniques[key] = true;
    }
    this.list.push({
        input: input,
        output: output
    });
    return this.list.length;
};

brain.NeuralNetwork.prototype.normalize = function(list, boundaries) {
    //normalises values in the list of training cases (hash form)
    list = _.shuffle(list || this.list || []);
    boundaries = boundaries || this.boundaries || {};
    if (!list.length) {
        throw "Training cases list is empty.";
    }
    var inputMin = _.extend({}, list[0].input);
    var inputMax = _.extend({}, list[0].input);
    var outputMin = _.extend({}, list[0].output);
    var outputMax = _.extend({}, list[0].output);
    _.map(_.keys(inputMin), function (key) {
        _.each(list, function (tc) {
            inputMin[key] = Math.min(tc.input[key], inputMin[key]);
            inputMax[key] = Math.max(tc.input[key], inputMax[key]);
        });
    });
    _.map(_.keys(outputMin), function (key) {
        _.each(list, function (tc) {
            outputMin[key] = Math.min(tc.output[key], outputMin[key]);
            outputMax[key] = Math.max(tc.output[key], outputMax[key]);
        });
    });
    _.map(_.keys(inputMin), function (key) {
        _.each(list, function (tc) {
            tc.input[key] = linearTransform(tc.input[key], inputMin[key], inputMax[key], 0, 1);
        });
    });
    _.map(_.keys(outputMin), function (key) {
        _.each(list, function (tc) {
            tc.output[key] = linearTransform(tc.output[key], outputMin[key], outputMax[key], 0, 1);
        });
    });
    _.extend(boundaries, {
        inputMin: inputMin,
        inputMax: inputMax,
        outputMin: outputMin,
        outputMax: outputMax
    });
    this.list = list;
    this.boundaries = boundaries;
    return list;
};

brain.NeuralNetwork.prototype.transcode = function(input) {
    //encode input, run trough neural net, and decode output
    return this.decode(this.run(this.encode(input)));
};

brain.NeuralNetwork.prototype.encode = function(input) {
    var boundaries = this.boundaries;
    input = _.clone(input);
    _.map(input, function(value, key){
        if ((boundaries.inputMin[key]===undefined)||(boundaries.inputMax[key]===undefined)) {throw "Input " + key + " is not bounded."};
        input[key]= linearTransform(value, boundaries.inputMin[key], boundaries.inputMax[key], 0, 1);
    });
    return input;
};

brain.NeuralNetwork.prototype.decode = function(output) {
    var boundaries = this.boundaries;
    output = _.clone(output);
    _.map(output, function(value, key){
        if ((boundaries.outputMin[key]===undefined)||(boundaries.outputMax[key]===undefined)) {throw "Output " + key + " is not bounded."};
        output[key]= linearTransform(value, 0, 1, boundaries.outputMin[key], boundaries.outputMax[key]);
    });
    return output;
};

brain.NeuralNetwork.prototype.decodeInput = function(input) {
    var boundaries = this.boundaries;
    input = _.clone(input);
    _.map(input, function(value, key){
        if ((boundaries.inputMin[key]===undefined)||(boundaries.inputMax[key]===undefined)) {throw "Input " + key + " is not bounded."};
        input[key]= linearTransform(value, 0, 1, boundaries.inputMin[key], boundaries.inputMax[key]);
    });
    return input;
};

brain.NeuralNetwork.prototype.logProgression = function(limit) {
    var log;
    if (!this.list || !this.list.length) return log;
    var step = Math.max(1, Math.round(limit / 100));
    if ((this.list.length % step) == 0) {
        if (this._lastLog === this.list.length) return;
        this._lastLog = this.list.length;
        log = Math.round(100 * this.list.length / limit) + " %";
        console.log(log);
    }
    return log;
};

brain.NeuralNetwork.prototype.hasEnoughData = function(limit){
    return this.list && (this.list.length >= limit);
};

brain.NeuralNetwork.prototype.toJSON2 = function(){
    var net = {};
    net['brainObject'] =  this.toJSON();
    net['brainBoundaries'] = JSON.parse(JSON.stringify(this.boundaries));
    return net;
};

brain.NeuralNetwork.prototype.fromJSON2 = function(net){
    var weights = net['brainObject'];
    var boundaries = net['brainBoundaries'];
    if (!weights || !boundaries) return false;
    this.fromJSON(weights);
    this.boundaries = boundaries;
    return true;
};
