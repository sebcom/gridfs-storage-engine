var mongo = require('mongodb');
var Grid = require('gridfs-stream');
var crypto = require('crypto');
var _ = require('underscore');
var gfs;


GridFSStorage.prototype.connectToMongoDB = function connectToMongoDB(options) {
    mongo.MongoClient.connect(options.url, function (err, db) {
        if (err) throw new Error(err);
        gfs = new Grid(db, mongo);
        console.log('gridfs-storage-engine: mongoDB connected');
        db.on('close', function () {
            console.log('gridfs-storage-engine: mongoDB connection close');
        });
        db.on('error', function (err) {
            console.error('gridfs-storage-engine: mongoDB error', err);
        });
        db.on('disconnect', function (err) {
            console.log('gridfs-storage-engine: mongoDB disconnect', err);
        });
        db.on('disconnected', function (err) {
            console.log('gridfs-storage-engine: mongoDB disconnected', err);
        });
        db.on('parseError', function (err) {
            console.error('gridfs-storage-engine: mongoDB parse', err);
        });
        db.on('timeout', function (err) {
            console.log('gridfs-storage-engine: mongoDB timeout', err);
        });
    });
}

function getFilename (req, file, cb) {
  crypto.pseudoRandomBytes(16, function (err, raw) {
    cb(err, err ? undefined : raw.toString('hex'))
  })
}

function GridFSStorage(opts) {
    this.getFilename = (opts.filename || getFilename)

    var options = _.extend({
        database: 'test',
        hostname: '127.0.0.1',
        port: 27017,
        url: null
    }, opts);

    if (!options.url) options.url = 'mongodb://' + options.hostname + ":" + options.port + "/" + options.database;

    this.connectToMongoDB(options);
}

GridFSStorage.prototype._handleFile = function _handleFile(req, file, cb) {
    this.getFilename(req, file, function (err, filename) {
      if (err) return cb(err)

      var writestream = gfs.createWriteStream({
        filename: filename,
        metadata: req.body,
        content_type: file.mimetype
      });

      file.stream.pipe(writestream);
      writestream.on('close', function (file) {
        console.log('gridfs-storage-engine: saved', file);
        cb(null, { gridfsEntry: file });
      });

    });
}

function removeFile(id) {
    gfs.remove({_id: id}, function (err) {
        if (err) return err;
        console.log('gridfs-storage-engine: deleted file._id ', id);
    });
}

GridFSStorage.prototype._removeFile = function _removeFile(req, file, cb) {
    delete file.buffer;
    if (file._id) removeFile(file._id);
    cb(null)
}

gfs = null;

module.exports = function (opts) {
    return new GridFSStorage(opts)
}
