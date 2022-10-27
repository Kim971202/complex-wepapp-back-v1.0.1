var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

/****************************************************
 * 택배 정보 조회
 ***************************************************/

router.get("/getParcelList", async (req, res, next) => {
  let {
    // serviceKey = "111111111", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startTime = "",
    endTime = "",
    dongCode = "",
    hoCode = "",
    parcelStatus = "",
    sendResult = "",
  } = req.query;

  console.log(
    // serviceKey,
    size,
    page,
    startTime,
    endTime,
    dongCode,
    hoCode,
    parcelStatus,
    sendResult
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

  // let _parcelFlag = "%";

  if (sendResult === "성공") _sendResult = "Y";
  else if (sendResult === "실패") _sendResult = "N";

  if (parcelStatus === "미수령") _parcelStatus = "0";
  else if (parcelStatus === "수령") _parcelStatus = "1";
  else if (parcelStatus === "반품") _parcelStatus = "2";

  // console.log("_parcelStatus=>" + _parcelStatus);

  try {
    let sql2 = `SELECT count(*) as cnt 
                FROM t_delivery 
                WHERE 1=1 `;

    //조회문 생성
    let sql = `SELECT idx AS idx, ROW_NUMBER() OVER(ORDER BY idx) AS No,  DATE_FORMAT(arrival_time, '%Y-%m-%d %h:%i:%s') AS arrivalTime, 
                      IFNULL(DATE_FORMAT(receive_time, '%Y-%m-%d %h:%i:%s'), "    -  -  ") AS receiveTime,
                      dong_code AS dongCode, ho_code AS hoCode, parcel_flag AS parcelFlag, 
                      (CASE  WHEN parcel_status = '0' THEN '미수령'
                             WHEN parcel_status = '1' THEN '수령'
                             WHEN parcel_status = '2' THEN '반품' ELSE '-' END) AS parcelStatus, 
                      IFNULL(memo, '-') AS parcelCorp,
                      (CASE  WHEN send_result = 'Y' THEN '성공'
                             WHEN send_result = 'N' THEN '실패' ELSE '실패' END) AS sendResult
               FROM t_delivery
               WHERE 1=1 `;

    console.log("sql: " + sql);

    //기존 조건 조회문 생성
    let BasicCondition = "";

    if (startTime) {
      //startDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(arrival_time) >= '${startTime}'`;
    } else {
      BasicCondition += `AND DATE(arrival_time) >= "1900-01-01"`;
    }

    if (endTime) {
      //endDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(arrival_time) <= '${endTime}'`;
    } else {
      BasicCondition += `AND DATE(arrival_time) <= "3000-12-31"`;
    }

    if (dongCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND dong_code = '${dongCode}'`;
    }

    if (hoCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND ho_code = '${hoCode}'`;
    }
    if (parcelStatus) {
      // 택배 수령 여부 전체, 0=미수령(택배도착), 1=수령, 2=반품
      BasicCondition += `AND parcel_Status = '${_parcelstatus}`;
    }
    if (sendResult) {
      // 통신 결과 알림결과로 구분 Y or N
      BasicCondition += `AND send_result = '${_sendResult}`;
    }

    BasicCondition += ` ORDER BY idx DESC LIMIT ?, ? `;

    //조건문 취합
    sql += BasicCondition;

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
 * 택배 상세조회
 ***************************************************/

router.get("/getDetailedParcelList/:idx", async (req, res, next) => {
  // let { idx = "", parcelStatus = "" } = req.query;
  let { idx = "" } = req.params;
  console.log(idx);
  try {
    const detailsql = `SELECT idx AS idx, DATE_FORMAT(arrival_time, '%Y-%m-%d %h:%i:%s') AS arrivalTime, 
                              (CASE  WHEN parcel_status = '0' THEN '미수령'
                                     WHEN parcel_status = '1' THEN '수령'
                                     WHEN parcel_status = '2' THEN '반품' ELSE '-' END)  AS parcelStatus, 
                              dong_code AS dongCode, ho_code AS hoCode, IFNULL(memo, " ") AS memo
                       FROM t_delivery
                       WHERE idx = ? `;

    // const data = await pool.query(detailsql, [idx, parcelStatus]);
    const data = await pool.query(detailsql, [idx]);

    console.log("Detailsql: " + detailsql);

    let arrivalTime = "";
    let parcelStatus = "";
    let dongCode = "";
    let hoCode = "";
    let memo = "";

    resultList = data[0];

    console.log("data[0] :" + data[0]);

    if (resultList.length > 0) {
      arrivalTime = resultList[0].arrivalTime;
      parcelStatus = resultList[0].parcelStatus;
      dongCode = resultList[0].dongCode;
      hoCode = resultList[0].hoCode;
      memo = resultList[0].memo;
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      arrivalTime,
      parcelStatus,
      dongCode,
      hoCode,
      memo,
    };

    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

/****************************************************
 * 택배 정보 등록 - 경비실 직접 등록
 ***************************************************/

router.post("/uploadParcel", async (req, res, next) => {
  let {
    arrivalTime = "",
    parcelStatus = "미수령",
    dongCode = "",
    hoCode = "",
    memo = "", // 경비 직접 등록 시 택배사로 입력
  } = req.body;

  console.log(arrivalTime, parcelStatus, dongCode, hoCode, memo);

  if (parcelStatus === "미수령") _parcelStatus = "0";
  else if (parcelStatus === "수령") _parcelStatus = "1";
  else if (parcelStatus === "반품") _parcelStatus = "2";

  let resultCode = "00";
  if (arrivalTime === "") resultCode = "10";

  if (parcelStatus === "") resultCode = "10";

  if (dongCode === "") resultCode = "10";

  if (hoCode === "") resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      let sql = `INSERT INTO t_delivery(arrival_time, parcel_box_no, mail_box_no, 
                                      dong_code, ho_code, parcel_status, parcel_flag, user_id, memo)
               VALUES(DATE_FORMAT(?,"%y-%m-%d"), 99, 99, ?, ?, ?, '유인', '경비실', ?) `;
      const data = await pool.query(sql, [
        arrivalTime, // 도착일시
        dongCode,
        hoCode,
        _parcelStatus, // 택배 상태 0: 미수령(택배도착), 1: 수령, 2: 반품
        memo,
      ]);
      console.log("data[0]=>" + data[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "글이 등록되었습니다.",
      };

      return res.json(jsonResult);
    } catch (error) {
      return res.status(500).json(error);
    }
  } else return res.json({ resultCode: resultCode });
});
/****************************************************
 * 택배 정보 수정 - 수령여부 변경
 ***************************************************/

// parcel_Status: 택배상태 0 : 미수령(택배도착), 1 : 수령, 2 : 반품

router.patch("/updateParcel/:idx", async (req, res, next) => {
  let { idx = "", parcelStatus = "" } = req.body;
  console.log(idx, parcelStatus);

  if (parcelStatus === "미수령") _parcelStatus = "0";
  else if (parcelStatus === "수령") _parcelStatus = "1";
  else if (parcelStatus === "반품") _parcelStatus = "2";

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  if (parcelStatus === "") resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const sql = `UPDATE t_delivery
                   SET parcel_status = ?, receive_time = now() 
                   WHERE idx = ? `;
      // const sql = `UPDATE t_delivery
      // SET parcel_status = ?'0' THEN '미수령'
      // WHEN parcel_status = '1' THEN '수령'
      // WHEN parcel_status = '2' THEN '반품' ELSE '-' END) AS parcelStatus,
      // WHERE idx = ? `;

      console.log("sql: " + sql);

      const data = await pool.query(sql, [_parcelStatus, idx]);

      console.log(data[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "글이 수정되었습니다.",
        idx,
      };

      return res.json(jsonResult);
    } catch (error) {
      return res.status(500).json(error);
    }
  } else return res.json({ resultCode: resultCode });
});

/****************************************************
 * 택배 정보 삭제
 ***************************************************/

router.delete("/deleteParcel/:idx", async (req, res, next) => {
  let { idx = 0 } = req.params;
  console.log(idx);

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const sql = `DELETE FROM t_delivery WHERE idx = ?`;
      console.log("sql: " + sql);

      const data = await pool.query(sql, [idx]);
      console.log(data[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "글이 삭제되었습니다.",
      };
      return res.json(jsonResult);
    } catch (error) {
      return res.status(500).json(error);
    }
  } else return res.json({ resultCode: resultCode });
});

module.exports = router;
