brain-extension.js
==================

An extension to the brain.js library, for some ease of use

The extension adds some methods for data normalization, encoding and decoding.

Install
-----

Include the brain.js, underscore.js and brain-extension.js libraries in your html header.

Demo
-----

[Game example](http://nrox.github.io/brain-extension.js/test.html)

A similar demo was applied to [q-learning.js](http://nrox.github.io/q-learning.js/test2.html).

Usage
-----

Create a neural network. Check the docs for brain.js:

    var net = brain.NeuralNetwork();

Then add inputs and outputs, the training cases

    net.addTrainingCase(input,output);

    net.addTrainingCase({onions: 4, carrots: 5},{happiness: 2});

    net.addTrainingCase({onions: 2, carrots: 2},{happiness: 3});

If you want to avoid repetition of training cases:

    net.addUniqueTrainingCase(input,output);

    //this is added
    net.addUniqueTrainingCase({onions: 4, carrots: 0},{happiness: 1});

    //if you call again with the same arguments it's not added
    net.addUniqueTrainingCase({onions: 4, carrots: 0},{happiness: 1});

Then normalize the data with

    net.normalize();

And train with

    net.train(net.list);

To run the network

    var output = net.transcode(input);

Transcode normalizes the input to the range 0..1, run it trough the network and decode the output from 0..1 to our values.

    var output = net.transcode({onions: 4, carrots: 5}); //output would be something like {happiness: 2}

