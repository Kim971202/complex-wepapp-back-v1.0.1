var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

/****************************************************
 * 방문차량예약 목록 조회
 ***************************************************/

router.get("/getParkingResv", async (req, res, next) => {
  let {
    // serviceKey = "111111111", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    dongCode = "",
    hoCode = "",
    inoutFlag = "",
    carNumber = "",
  } = req.query;

  console.log(
    size,
    page,
    startDate,
    endDate,
    dongCode,
    hoCode,
    inoutFlag,
    carNumber
  );

  // if ((await checkServiceKeyResult(serviceKey)) == false) {
  //   return res.json({
  //     resultCode: "30",
  //     resultMsg: "등록되지 않은 서비스키 입니다.",
  //   });
  // }

  let totalCount = 0;
  let block = 10;
  let total_page = 0;
  let start = 0;
  let end = size;
  let start_page = 1;
  let end_page = block;

  try {
    let sql2 = `SELECT count(*) as cnt 
                FROM t_parking_resv
                WHERE 1=1 `;

    //조회문 생성
    let sql = `SELECT resv_no as idx, ROW_NUMBER() OVER(ORDER BY resv_no) AS No, dong_code AS dongCode, ho_code AS hoCode, car_no AS carNumber, 
                        DATE_FORMAT(vis_start_date, '%Y-%m-%d') AS visitStartDate,
                        DATE_FORMAT(vis_end_date, '%Y-%m-%d') AS visitEndDate,
                        (CASE WHEN resv_method = 'W' THEN '월패드'
                              WHEN resv_method = 'S' THEN '스마트폰APP' ELSE '관리실' END) AS resvMethod,
                        inout_flag AS inoutFlag
                FROM t_parking_resv
                WHERE 1=1 `;

    console.log("sql: " + sql);

    //기존 조건 조회문 생성
    let BasicCondition = "";
    let carNo = ` LIKE '%${carNumber}%'`;

    if (startDate) {
      //startDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(vis_start_date) >= '${startDate}'`;
    } else {
      BasicCondition += `AND DATE(vis_start_date) >= "1900-01-01"`;
    }

    if (endDate) {
      //endDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(vis_start_date) <= '${endDate}'`;
    } else {
      BasicCondition += `AND DATE(vis_start_date) <= "3000-12-31"`;
    }

    if (dongCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND dong_code = '${dongCode}'`;
    }

    if (hoCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND ho_code = '${hoCode}'`;
    }

    if (carNumber) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND car_no ${carNo}`;
    }

    if (inoutFlag) {
      // 입차여부는 개별 독립 조건
      BasicCondition += `AND inout_flag = '${inoutFlag}'`;
    }

    // BasicCondition += ` ORDER BY idx DESC LIMIT ?, ? `;

    //조건문 취합
    sql += BasicCondition;

    sql += ` ORDER BY idx DESC LIMIT ?, ? `;

    //조회 갯수 생성용 조건문
    sql2 += BasicCondition;

    const data2 = await pool.query(sql2);

    totalCount = data2[0][0].cnt; //총 게시글 수
    total_page = Math.ceil(totalCount / size); //총 페이지 수

    start = (page - 1) * size; //시작행
    start_page = page - ((page - 1) % block);
    end_page = start_page + block - 1;

    console.log("start=%d", start);
    console.log("end=%d", end);
    if (total_page < end_page) end_page = total_page;

    let paging = {
      totalCount,
      total_page,
      page,
      start_page,
      end_page,
      ipp: size,
    };

    const data = await pool.query(sql, [Number(start), Number(end)]);

    let list = data[0];
    let jsonResult = {
      resultCode: "00",
      list: list,
      paging: paging,
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

/****************************************************
 * 방문차량예약 목록 상세 조회
 ***************************************************/

router.get("/getDetailedParkingResv/:idx", async (req, res, next) => {
  let { idx = "" } = req.params;

  console.log(idx);

  try {
    const detailsql = `SELECT a.resv_no as idx, DATE_FORMAT(a.vis_start_date, '%Y-%m-%d') AS visitStartDate, DATE_FORMAT(a.vis_end_date, '%Y-%m-%d') AS visitEndDate,
                                a.car_no AS carNumber, CONCAT(a.dong_code, "동", a.ho_code, "호") AS applicant, 
                                DATE_FORMAT(b.insert_dtime, '%Y-%m-%d %h:%i:%s') AS registerDate, a.resv_method AS resvMethod, 
                                a.resv_flag AS resvFlag, a.inout_flag AS inoutFlag
                         FROM t_parking_resv a
                         INNER JOIN t_parking_resv_his b
                         WHERE a.resv_no = b.resv_no AND a.resv_no = ?`;

    const data = await pool.query(detailsql, [idx]);

    console.log("Detailsql: " + detailsql);

    let visitStartDate = "";
    let visitEndDate = "";
    let carNumber = "";
    let applicant = "";
    let registerDate = "";
    let resvMethod = "";
    // let resvFlag = "";
    let inoutFlag = "";

    resultList = data[0];

    console.log("data[0] :" + data[0]);

    if (resultList.length > 0) {
      visitStartDate = resultList[0].visitStartDate;
      visitEndDate = resultList[0].visitEndDate;
      carNumber = resultList[0].carNumber;
      applicant = resultList[0].applicant;
      registerDate = resultList[0].registerDate;
      resvMethod = resultList[0].resvMethod;
      //   resvFlag = resultList[0].resvFlag;
      inoutFlag = resultList[0].inoutFlag;
    }
    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      visitStartDate,
      visitEndDate,
      carNumber,
      applicant,
      registerDate,
      resvMethod,
      //   resvFlag,
      inoutFlag,
    };

    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

/****************************************************
 * 방문차량예약 등록
 ***************************************************/

router.post("/uploadParkingResv", async (req, res, next) => {
  let {
    visitDate = "", // 사용일수는 기본값으로 1일
    carNumber = "",
    dongCode = "",
    hoCode = "",
  } = req.body;

  console.log(visitDate, carNumber, dongCode, hoCode);

  let resultCode = "00";

  if (dongCode === "") resultCode = "10";

  if (hoCode === "") resultCode = "10";

  if (visitDate === "") resultCode = "10";

  if (carNumber === "") resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      let sql = `INSERT INTO t_parking_resv(vis_start_date, vis_end_date, car_no, resv_method, dong_code, ho_code, resv_flag, collect_dtime, inout_flag)
                 VALUES(DATE_FORMAT(?,"%y-%m-%d"), DATE_ADD(vis_start_date, INTERVAL 1 DAY), ?, 'M', ?, ?, 'N', now(), 'N')`;
      console.log("sql: " + sql);

      const data = await pool.query(sql, [
        visitDate,
        carNumber,
        dongCode,
        hoCode,
      ]);
      console.log("data[0]=>" + data[0]);

      // t_parking_resv_his 테이블에 정보 동시 추가
      const getIdxSQL = `SELECT resv_no AS idx FROM t_parking_resv ORDER BY idx DESC LIMIT 1`;
      const getIdx = await pool.query(getIdxSQL);
      console.log("getIdx: " + getIdx[0][0].idx);

      const sql1 = `INSERT INTO t_parking_resv_his(insert_dtime, resv_no, vis_start_date, vis_end_date, car_no, resv_method, dong_code, ho_code, resv_flag, collect_dtime, inout_flag)
                   VALUES(now(),?,?,DATE_ADD(vis_start_date, INTERVAL 1 DAY),?,'W',?,?,'N',now(), 'N')`;
      console.log("sql1: " + sql1);
      const data1 = await pool.query(sql1, [
        getIdx[0][0].idx,
        visitDate,
        carNumber,
        dongCode,
        hoCode,
      ]);
      console.log(data1[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "방문차량이 예약되었습니다.",
      };

      return res.json(jsonResult);
    } catch (error) {
      return res.status(500).json(error);
    }
  } else return res.json({ resultCode: resultCode });
});

/****************************************************
 * 방문차량예약 취소
 ***************************************************/

// resv_flag: 예약취소구분 N : 예약 중, Y : 예약 취소
router.patch("/updateParkingResv", async (req, res, next) => {
  let { idx = 0, resvStatus = "" } = req.body;
  console.log(idx, resvStatus);

  if (resvStatus === "예약") _resvStatus = "N";
  else if (resvStatus === "취소") _resvStatus = "Y";

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  if (resvStatus === "") resultCode = "10";

  if (resultCode === "00") {
    try {
      const sql = `UPDATE t_parking_resv SET resv_flag = ? WHERE resv_no = ?`;
      console.log("sql: " + sql);
      const data = await pool.query(sql, [_resvStatus, idx]);
      console.log(data[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "예약 상태가 변경되었습니다.",
        idx,
      };

      return res.json(jsonResult);
    } catch (error) {
      return res.status(500).json(error);
    }
  } else return res.json({ resultCode: resultCode });
});

/****************************************************
 * 방문차량예약 목록 삭제
 ***************************************************/

router.delete("/deleteParkingResv/:idx", async (req, res, next) => {
  let { idx = 0 } = req.params;
  console.log(idx);

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const sql = `DELETE FROM t_parking_resv WHERE resv_no = ?`;
      console.log("sql: " + sql);
      const data = await pool.query(sql, [idx]);
      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "예약이 취소되었습니다.",
      };
      return res.json(jsonResult);
    } catch (error) {
      return res.status(500).json(error);
    }
  } else return res.json({ resultCode: resultCode });
});

module.exports = router;
