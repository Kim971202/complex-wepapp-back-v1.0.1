const express = require("express");
const router = express.Router();
const pool = require("../DB/dbPool");

/****************************************************
 * 민원 목록 조회
 ***************************************************/

router.get("/getApplicationList", async (req, res, next) => {
  let {
    page = 1, //             현재페이지
    size = 10, //        페이지 당 결과수
    startDate = "",
    endDate = "",
    progressStatus = "",
    dongCode = "",
    hoCode = "",
  } = req.query;

  console.log(startDate, endDate, progressStatus, dongCode, hoCode);

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
    FROM t_application_complaint 
    WHERE 1=1 `;

    //조회문 생성
    let sql = `SELECT idx as idx, ROW_NUMBER() OVER(ORDER BY idx) AS No, app_title AS appTilte, DATE_FORMAT(app_date, '%Y-%m-%d') AS appDate, 
                      app_code AS appCode app_method AS appMethod,
                    
                    dong_code AS dongCode, ho_code AS hoCode, progress_status AS progressStatus,
                    IFNULL(DATE_FORMAT(app_receipt_date, '%Y-%m-%d'), "    -  -  ") AS appReceiptDate,
                    IFNULL(DATE_FORMAT(app_complete_date, '%Y-%m-%d'), "    -  -  ") AS appCompleteDate,
              FROM t_application_complaint
              WHERE 1=1 `;

    console.log("sql: " + sql);

    //기존 조건 조회문 생성
    let BasicCondition = "";

    let progressStatus_ = "%";

    if (progressStatus === "취소") progressStatus_ = "0";
    else if (progressStatus === "신청") progressStatus_ = "1";
    else if (progressStatus === "접수") progressStatus_ = "2";
    else if (progressStatus === "완료") progressStatus_ = "3";

    console.log("progressStatus_=>" + progressStatus_);

    // let contractTitleCondition = `LIKE '${contractTitle}%'`;
    if (startDate) {
      //startDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(app_date) >= '${startDate}'`;
    } else {
      BasicCondition += `AND DATE(app_date) >= '1900-01-01'`;
    }

    if (endDate) {
      //endDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(app_date) <= '${endDate}'`;
    } else {
      BasicCondition += `AND DATE(app_date) <= '3000-12-31'`;
    }

    if (progressStatus) {
      //접수 상태 조회는 개별 독립 조건
      BasicCondition += `AND progress_status = '${progressStatus_}'`;
    }

    if (dongCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND dong_code = '${dongCode}'`;
    }

    if (hoCode) {
      // 동과 호는 개별 독립 조건
      BasicCondition += `AND ho_code = '${hoCode}'`;
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

    console.log("resultList: " + resultList);

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
 * 민원 목록 상세보기
 ***************************************************/

router.get("/getDetailedApplicationList", async (req, res, next) => {
  let { idx = "" } = req.query;
  console.log(idx);
  try {
    const detailsql = `SELECT DATE_FORMAT(app_date, '%Y-%m-%d %h:%i:%s') AS complaintAppDate, a.app_code AS appCategory, 
                              app_content AS appContent, CONCAT(dong_code, "동", ho_code, "호") AS applicant, app_method AS appMethod,
                              IFNULL(DATE_FORMAT(app_receipt_date, '%Y-%m-%d'), "    -  -  ") AS appReceiptDate,
                              IFNULL(DATE_FORMAT(app_complete_date, '%Y-%m-%d'), "    -  -  ") AS appCompleteDate,
                              progress_status AS progressStatus, IFNULL(b.memo, " ") AS memo
                      FROM t_application_complaint a
                      INNER JOIN t_complaints_type b
                      WHERE a.app_code = b.app_code and a.idx = ?`;

    const data = await pool.query(detailsql, [idx]);

    console.log("Detailsql: " + detailsql);

    let resultList = data[0];
    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      data: {
        resultList,
      },
    };

    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

/****************************************************
 * 민원 진행상태 수정
 ***************************************************/
/**
 * 관리사무실에서의 민원 변경은 민원의 진행 상태값만 변경 가능하다.
 * ef. 처리가 완료된 민원의 경우 접수 -> 완료로 변경
 *
 * *************** 진행단계 ***************
 *  0: 취소   1: 신청   2: 접수   3: 처리
 * ****************************************/

router.put("/updateComplaint", async (req, res, next) => {
  let { idx = 0, progressStatus = 0 } = req.body;
  console.log(idx, progressStatus);

  try {
    const sql = `UPDATE t_application_complaint SET progress_status = ? WHERE idx = ?`;
    console.log("sql: " + sql);

    const data = await pool.query(sql, [progressStatus, idx]);
    // console.log(data[0]);
    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };

    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;
