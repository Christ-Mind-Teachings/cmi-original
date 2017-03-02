var s3 = require('s3');

var client;

function downloadFile(params) {
  var downloader = client.downloadFile(params);

  downloader.on('error', function(err) {
    console.error("unable to download:", err.stack);
  });
  downloader.on('progress', function() {
    console.log("progress", downloader.progressAmount, downloader.progressTotal);
  });
  downloader.on('end', function() {
    console.log("done downloading");
  });
}

function uploadFile(params) {
  var uploader = client.uploadFile(params);
  uploader.on('error', function(err) {
    console.error("unable to upload:", err.stack);
  });
  uploader.on('progress', function() {
    console.log("progress", uploader.progressMd5Amount,
              uploader.progressAmount, uploader.progressTotal);
  });
  uploader.on('end', function() {
    console.log("done uploading");
  });
}

module.exports = {

  init: function() {
    client = s3.createClient({
      maxAsyncS3: 20,
      s3RetryCount: 3,
      s3RetryDelay: 1000,
      multipartUploadThreshold: 20971520,
      multipartUploadSize: 15728640
    });
  },

  download: function(domain, audiofile) {
    var bucket_path = domain.substr("https://s3.amazonaws.com/".length);
    var index = bucket_path.indexOf("/");
    var bucket, key, object;

    if (index == -1) {
      return false;
    }

    bucket = bucket_path.substr(0, index);
    object = bucket_path.substr(index+1);
    key = object + audiofile;

    console.log("bucket: %s, key: %s", bucket, key);

    var parms = {
      localFile: audiofile,
      s3Params: {
        Bucket: "assets.christmind.info",
        Key: key
      }
    }

    downloadFile(parms);
  },

  upload: function(domain, remoteFile, audioFile) {
    var bucket_path = domain.substr("https://s3.amazonaws.com/".length);
    var index = bucket_path.indexOf("/");
    var bucket, key, object;

    if (index == -1) {
      return false;
    }

    bucket = bucket_path.substr(0, index);
    object = bucket_path.substr(index+1);
    key = object + remoteFile;

    console.log("bucket: %s, key: %s, audioFile: %s", bucket, key, audioFile);

    var parms = {
      localFile: audioFile,
      s3Params: {
        Bucket: "assets.christmind.info",
        Key: key,
        ACL: "public-read"
      }
    };

    uploadFile(parms);
  }

};

