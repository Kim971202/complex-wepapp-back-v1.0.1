var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

/****************************************************
 * 엘리베이터 제어이력 조회
 ***************************************************/

router.get("/getElevatorCallLog", async (req, res, next) => {
  let {
    // serviceKey = "111111111", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    reqMethod = "",
    elvDirection = "",
    commResult = "",
    dongCode = "",
    hoCode = "",
  } = req.query;

  console.log(
    // serviceKey,
    size,
    page,
    startDate,
    endDate,
    reqMethod,
    elvDirection,
    commResult,
    dongCode,
    hoCode
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

  if (elvDirection === "상향") _elvDirection = "U";
  else if (elvDirection === "하향") _elvDirection = "D";

  if (commResult === "성공") _commResult2 = "Y";
  else if (commResult === "실패") _commResult2 = "N";

  try {
    let sql2 = `SELECT count(*) as cnt 
    FROM t_elevator_control 
    WHERE 1=1 `;

    //조회문 생성
    let sql = `SELECT ROW_NUMBER() OVER(ORDER BY idx DESC) AS No, DATE_FORMAT(control_req_dtime, '%Y-%m-%d %h:%i:%s') AS controlReqDTime, 
                      direction, dong_code AS dongCode, ho_code AS hoCode, DATE_FORMAT(comm_dtime, '%Y-%m-%d %h:%i:%s') AS commDTime,
                      (CASE WHEN req_method = 'W' THEN '월패드'
                            WHEN req_method = 'S' THEN '스마트폰APP' ELSE '기타' END) AS reqMethod,
                      (CASE WHEN direction = 'U' THEN '상향'
                            WHEN direction = 'D' THEN '하향' ELSE '실패' END) AS elvDirection,
                      (CASE WHEN comm_result = 'Y' THEN '성공'
                            WHEN comm_result = 'N' THEN '실패' ELSE '실패' END) AS commResult
               FROM t_elevator_control
               WHERE 1=1 `;

    console.log("sql: " + sql);

    //기존 조건 조회문 생성
    let BasicCondition = "";

    if (startDate) {
      //startDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(ev_arrive_time) >= '${startDate}'`;
    } else {
      BasicCondition += `AND DATE(ev_arrive_time) >= "1900-01-01"`;
    }

    if (endDate) {
      //endDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(ev_arrive_time) <= '${endDate}'`;
    } else {
      BasicCondition += `AND DATE(ev_arrive_time) <= "3000-12-31"`;
    }

    if (reqMethod) {
      //reqMethod(제어기기)는 개별 독립 조건
      BasicCondition += `AND req_method = '${reqMethod}'`;
    }

    if (elvDirection) {
      //elvDirection(제어방향)은 개별 독립 조건
      BasicCondition += `AND direction = '${_elvDirection}'`;
    }

    if (commResult) {
      //commResul(통신상태)는 개별 독립 조건
      BasicCondition += `AND comm_result = '${_commResult}'`;
    }

    if (dongCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND dong_code = '${dongCode}'`;
    }

    if (hoCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND ho_code = '${hoCode}'`;
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
 * 엘리베이터 제어이력 삭제
 ***************************************************/

// router.delete("/deleteElevatorCallLog", async (req, res, next) => {
//   let { idx = 0 } = req.body;
//   console.log(idx);

//   try {
//     const sql = `DELETE FROM t_elevator_control WHERE idx = ?`;
//     console.log(sql);
//     const data = await pool.query(sql, [idx]);
//     let jsonResult = {
//       resultCode: "00",
//       resultMsg: "NORMAL_SERVICE",
//     };
//     return res.json(jsonResult);
//   } catch (error) {
//     return res.status(500).json(error);
//   }
// });

module.exports = router;
