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
      }
    },
    aws_s3: {
      options: {
        accessKeyId: "<%= aws.AWSAccessKeyId %>", // Use the variables
        secretAccessKey: "<%= aws.AWSSecretKey %>", // You can also use env variables
        region: "ap-southeast-1",
        uploadConcurrency: 5,
        downloadConcurrency: 5
      },
      prod: {
        options: {
          bucket: "christmind.info",
          differential: true,
          gzipRename: "ext"
        },
        files: [
          {action: "upload", expand: true, cwd: "./_site", src: ["**"], dest: "/"}
        ]
      }
    }
  });

  grunt.registerTask("deploy-prod",  ["aws_s3:prod"]);

};

