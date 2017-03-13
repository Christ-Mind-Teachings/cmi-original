module.exports = function(grunt) {
  require("jit-grunt")(grunt, {
  });

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    aws: grunt.file.readJSON("config/aws-keys.json"),
    browserify: {
      cmi: {
        files: {
          'public/js/cmi.js': ['src/js/cmi.js']
        }
      },
      search: {
        files: {
          'public/js/search.js': ['src/js/search.js']
        }
      }
    },
    aws_s3: {
      options: {
        accessKeyId: "<%= aws.AWSAccessKeyId %>", // Use the variables
        secretAccessKey: "<%= aws.AWSSecretKey %>", // You can also use env variables
        region: "us-east-1",
        uploadConcurrency: 5,
        downloadConcurrency: 5
      },
      nwffacim: {
        options: {
          bucket: "assets.christmind.info",
          differential: true,
          gzipRename: "ext"
        },
        files: [
          {action: "upload", expand: true, cwd: "./src/aws/nwffacim/books", src: ["**"], dest: "/nwffacim/books"}
        ]
      }
    }
  });

  grunt.registerTask("aws-nwffacim",  ["aws_s3:nwffacim"]);

};

