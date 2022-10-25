const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 9000;

const memberapi = require("./routes/memberapi");
const vuebbsRoute = require("./routes/vuebbs-route");
const boardapi = require("./routes/boardapi");

// ********************************************************
// 추가

const inoutCarRoute = require("./routes/inoutCarRouter");
const elevatorRoute = require("./routes/elevatorRouter");
const parkingRoute = require("./routes/parkingRouter");
const parcelRoute = require("./routes/parcelRouter");
const keyContractRoute = require("./routes/keyContractRouter");
const complaintRoute = require("./routes/complaintRouter");
const visitCarRoute = require("./routes/visitCarRouter");
const contractDocRoute = require("./routes/contractDocRouter");

// ********************************************************

const corsOptions = {
  origin: "http://localhost:8080", //허용할 도메인 설정
  optionsSuccessStatus: 200,
};

app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  //res.header("Access-Control-Allow-Headers", "content-type");
  res.header("Access-Control-Allow-Headers", "content-type, access-token"); //Vue.js 3 & NodeJS  Vue CLI 로그인 처리 3 테스트 시 반드시 필요
  next();
});

app.use("/members", memberapi);
app.use("/vueboard", vuebbsRoute);
app.use("/boards", boardapi);

// ********************************************************
// 추가
app.use("/inoutCar", inoutCarRoute);
app.use("/elevator", elevatorRoute);
app.use("/parking", parkingRoute);
app.use("/parcel", parcelRoute);
app.use("/keyContract", keyContractRoute);
app.use("/complaint", complaintRoute);
app.use("/visitCar", visitCarRoute);
app.use("/contractDoc", contractDocRoute);

// ********************************************************

app.get("/", (req, res) => {
  res.send("Hello Node.js!");
});

app.listen(port, () => {
  console.log(`서버가 실행됩니다. http://localhost:${port}`);
});
