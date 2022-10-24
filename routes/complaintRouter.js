const express = require("express");
const router = express.Router();
const pool = require("../database/pool");

/****************************************************
 * 민원 목록 조회
 ***************************************************/

router.get("/getApplicationList", async (req, res, next) => {
  let {
    // serviceKey = "111111111", // 서비스 인증키
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

  let _progressStatus = "%";

  if (progressStatus === "취소") _progressStatus = "0";
  else if (progressStatus === "신청") _progressStatus = "1";
  else if (progressStatus === "접수") _progressStatus = "2";
  else if (progressStatus === "완료") _progressStatus = "3";

  console.log("_progressStatus=>" + _progressStatus);

  try {
    let sql2 = `SELECT count(*) as cnt 
    FROM t_application_complaint 
    WHERE 1=1 `;

    //조회문 생성
    let sql = `SELECT idx as idx, ROW_NUMBER() OVER(ORDER BY idx) AS No, DATE_FORMAT(app_date, '%Y-%m-%d') AS appDate, 
                      dong_code AS dongCode, ho_code AS hoCode, app_method AS appMethod,
                      IFNULL(DATE_FORMAT(app_receipt_date, '%Y-%m-%d'), "    -  -  ") AS appReceiptDate,
                      IFNULL(DATE_FORMAT(app_complete_date, '%Y-%m-%d'), "    -  -  ") AS appCompleteDate,
                      (CASE WHEN progress_status = '0' THEN '취소' 
                            WHEN progress_status = '1' THEN '신청' 
                            WHEN progress_status = '2' THEN '접수' 
                            WHEN progress_status = '3' THEN '완료' ELSE '-' END) AS progressStatus
              FROM t_application_complaint
              WHERE 1=1 `;

    console.log("sql: " + sql);

    //기존 조건 조회문 생성
    let BasicCondition = "";

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
      BasicCondition += `AND progress_status = '${_progressStatus}'`;
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

router.get("/getDetailedApplicationList/:idx", async (req, res, next) => {
  let { idx = "" } = req.params;
  console.log(idx);
  try {
    const detailsql = `SELECT DATE_FORMAT(app_date, '%Y-%m-%d %h:%i:%s') AS appDate, a.app_code AS appCategory, 
                              app_content AS appContent, CONCAT(dong_code, "동", ho_code, "호") AS applicant, app_method AS appMethod,
                              IFNULL(DATE_FORMAT(app_receipt_date, '%Y-%m-%d'), "    -  -  ") AS appReceiptDate,
                              IFNULL(DATE_FORMAT(app_complete_date, '%Y-%m-%d'), "    -  -  ") AS appCompleteDate,
                              (CASE  WHEN progress_status = '0' THEN '취소'
                                     WHEN progress_status = '1' THEN '신청'
                                     WHEN progress_status = '2' THEN '접수' 
                                     WHEN progress_status = '3' THEN '완료' ELSE '-' END)  AS progressStatus,
                                     IFNULL(b.memo, " ") AS memo
                      FROM t_application_complaint a
                      INNER JOIN t_complaints_type b
                      WHERE a.app_code = b.app_code and a.idx = ?`;

    const data = await pool.query(detailsql, [idx]);

    console.log("Detailsql: " + detailsql);

    let appDate = "";
    let appCode = "";
    let appContent = "";
    let applicant = "";
    let appMethod = "";
    let appReceiptDate = "";
    let appCompleteDate = "";
    let progressStatus = "";
    let memo = "";

    resultList = data[0];

    console.log("data[0] :" + data[0]);

    if (resultList.length > 0) {
      appDate = resultList[0].appDate;
      appCode = resultList[0].appCode;
      appContent = resultList[0].appContent;
      applicant = resultList[0].applicant;
      appMethod = resultList[0].appMethod;
      appReceiptDate = resultList[0].appReceiptDate;
      appCompleteDate = resultList[0].appCompleteDate;
      progressStatus = resultList[0].progressStatus;
      memo = resultList[0].memo;
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      appDate,
      appCode,
      appContent,
      applicant,
      appMethod,
      appReceiptDate,
      appCompleteDate,
      progressStatus,
      memo,
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

router.patch("/updateComplaint/:idx", async (req, res, next) => {
  let { idx = "", progressStatus = 0 } = req.body;
  console.log(idx, progressStatus);

  if (progressStatus === "취소") progressStatus = "0";
  else if (progressStatus === "신청") progressStatus = "1";
  else if (progressStatus === "접수") progressStatus = "2";
  else if (progressStatus === "완료") progressStatus = "3";

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  if (progressStatus === "") resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const sql = `UPDATE t_application_complaint 
                   SET progress_status = ? 
                   WHERE idx = ? `;
      console.log("sql: " + sql);

      const data = await pool.query(sql, [progressStatus, idx]);
      // console.log(data[0]);
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
 * 민원 관리 삭제
 ***************************************************/

router.delete("/deleteComplaint/:idx", async (req, res, next) => {
  let { idx = 0 } = req.params;
  console.log(idx);

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const sql = `DELETE FROM t_application_complaint WHERE idx = ?`;
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
