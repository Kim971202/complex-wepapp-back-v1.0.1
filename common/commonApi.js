var express = require("express");
var router = express.Router();

let { uploadSingleImage } = require("./fileUpload");

router.get("/download", function (req, res) {
  let { fileName = "" } = req.query;
  console.log(fileName);
  const file = `D:/2022_project/project_2022/complex-webapp/backend_complex/public/contractDoc/${fileName}`;
  res.download(file);
});

router.post("/file", (req, res, next) => {
  uploadSingleImage(req, res, function (err) {
    if (err) {
      return res.status(400).send({ message: err.message });
    }
    // Everything went fine.
    file = req.file;
    console.log(file);
    res.status(200).send({
      filename: file.filename,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
      fieldname: file.fieldname,
    });
  });
});

module.exports = router;
