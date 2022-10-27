var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

/****************************************************
 * 입출차 정보 조회
 ***************************************************/
router.get("/getCarIOList", async (req, res, next) => {
  let {
    // serviceKey = "111111111", // 서비스 인증키
    page = 1, //               페이지 번호
    size = 10, //           페이지 당 결과수
    startTime = "",
    endTime = "",
    dongCode = "",
    hoCode = "",
    sendResult = "",
    carNumber = "",
  } = req.query;

  console.log(
    // serviceKey,
    page,
    size,
    startTime,
    endTime,
    dongCode,
    hoCode,
    sendResult,
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

  if (sendResult === "성공") _sendResult = "Y";
  else if (sendResult === "실패") _sendResult = "N";

  try {
    //조회문 생성
    sql = `SELECT ROW_NUMBER() OVER(ORDER BY idx DESC) AS No, DATE_FORMAT(inout_dtime, '%Y-%m-%d %h:%i:%s') AS inoutDtime, 
                        inout_flag AS inoutFlag, dong_code AS dongCode, ho_code AS hoCode, car_no AS carNumber, 
                        DATE_FORMAT(send_time, '%Y-%m-%d %h:%i:%s') AS sendTime, 
                        (CASE WHEN send_result = 'Y' THEN '성공'
                              WHEN send_result = 'N' THEN '실패' ELSE '실패' END) AS sendResult
               FROM t_parking_io
               WHERE 1=1 `;

    //기존 조건 조회문 생성

    let BasicCondition = "";
    let carNo = ` LIKE '%${carNumber}%'`;

    if (startTime) {
      //startDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(inout_dtime) >= '${startTime}'`;
    } else {
      BasicCondition += `AND DATE(inout_dtime) >= "1900-01-01 00:00:00"`;
    }

    if (endTime) {
      //endDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(inout_dtime) <= '${endTime}'`;
    } else {
      BasicCondition += `AND DATE(inout_dtime) <= "3000-12-31 00:00:00"`;
    }

    if (dongCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND dong_code = '${dongCode}'`;
    }

    if (hoCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND ho_code = '${hoCode}'`;
    }

    if (sendResult) {
      // 통신결과(세대알림) 개별 독립 조건
      BasicCondition += `AND send_result = '${_sendResult}'`;
    }

    if (carNumber) {
      // 차량번호 개별 독립 조건
      BasicCondition += `AND car_no ${carNo}`;
    }

    BasicCondition += ` ORDER BY idx DESC LIMIT ?, ? `;

    //조건문 취합
    sql += BasicCondition;

    let sql2 = `SELECT count(*) as cnt 
    FROM t_parking_io 
    WHERE 1=1 `;
    console.log("sql2: " + sql2);
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
 * 입출차 정보 상세보기
 ***************************************************/

//  router.get("/getDetailedCarIOList", async (req, res, next) => {
//     let { carNumber = "" } = req.query;
//     console.log(carNumber);
//     try {

//         const sql = `SELECT inout_flag AS inoutFlag, DATE_FORMAT(inout_dtime, '%Y-%m-%d %h:%i:%s') AS inoutDtime,
//                                   dong_code AS dongCode, ho_code AS hoCode, car_no AS carNo,
//                                   DATE_FORMAT(send_time, '%Y-%m-%d %h:%i:%s') AS sendTime, send_result AS sendResult
//                            FROM t_parking_io
//                            WHERE car_no = ?`;

//         const data = await pool.query(sql, [carNumber]);

//         console.log("Detailsql: " + sql);

//         let resultList = data[0];

//         let jsonResult = {
//             resultCode: "00",
//             resultMsg: "NORMAL_SERVICE",
//             data: {
//               resultList,
//             },
//         };

//         return res.json(jsonResult);
//     } catch (error) {
//         return res.status(500).json(error);
//     }
// });

/****************************************************
 * 입출차 정보 삭제
 ***************************************************/

router.delete("/deleteCarIOList/:idx", async (req, res, next) => {
  let { idx = "" } = req.body;

  console.log(idx);

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const sql = `DELETE FROM t_parking_io WHERE idx = ?`;
      console.log("sql: " + sql);
      const data = await pool.query(sql, [idx]);
      console.log("data[0]=>" + data[0]);

      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "삭제되었습니다.",
      };
      return res.json(jsonResult);
    } catch (error) {
      return res.status(500).json(error);
    }
  } else return res.json({ resultCode: resultCode });
});

module.exports = router;
