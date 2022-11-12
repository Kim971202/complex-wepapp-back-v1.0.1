var express = require("express");
var router = express.Router();
const pool = require("../database/pool");

let { checkUploadType, deleteFile, listDir } = require("../common/fileUpload");
// 공지사항 목록조회
router.get("/getNoticeList", async (req, res, next) => {
  let {
    serviceKey = "111111111", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    notiType = "",
    sendResult = "",
    notiContent = "",
  } = req.query;

  console.log(
    serviceKey,
    size,
    page,
    startDate,
    endDate,
    notiType,
    sendResult,
    notiContent
  );

  let totalCount = 0;
  let block = 10;
  let total_page = 0;
  let start = 0;
  let end = size;
  let start_page = 1;
  let end_page = block;

  try {
    let defaultCondition = `LIKE '%'`;
    let defaultNotiTypeCondtion = defaultCondition;
    let defaultSendResultCondition = defaultCondition;
    let defaultNotiContentCondtion = defaultCondition;

    let defaultStartDate = "";
    let defaultEndDate = "";

    let notiTypeCondition = "";
    let sendResultCondition = "";
    let notiContentCondition = "";

    if (!startDate) {
      defaultStartDate = "1990-01-01";
    }
    if (!endDate) {
      defaultEndDate = "3000-01-01";
    }
    if (!!notiType) {
      notiTypeCondition = `= '${notiType}'`;
      defaultNotiTypeCondtion = "";
    }
    if (!!sendResult) {
      sendResultCondition = `= '${sendResult}'`;
      defaultSendResultCondition = "";
    }
    if (!!notiContent) {
      notiContentCondition = `LIKE '${notiContent}%'`;
      defaultNotiContentCondtion = "";
    }

    const sql2 = `SELECT count(idx) as cnt
    FROM t_notice
    WHERE  
          (DATE(start_date) >= '${defaultStartDate} ${startDate}' AND (DATE(end_date) <= '${defaultEndDate} ${endDate}'))
          AND noti_type ${defaultNotiTypeCondtion} ${notiTypeCondition}
          AND noti_content ${defaultNotiContentCondtion} ${notiContentCondition}`;

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

    const sql3 = `UPDATE t_notice a
                      INNER JOIN t_notice_send b
                      ON a.idx = b.idx
                      SET a.new_flag = IF (DATE_ADD(a.start_date, INTERVAL 3 DAY)  >=now(), 'Y', 'N')
                      WHERE a.idx = b.idx;`;
    const data3 = await pool.query(sql3);

    const sql = `SELECT a.idx AS idx, ROW_NUMBER() OVER(ORDER BY a.idx) AS No, a.noti_type AS notiType, a.noti_title AS notiTitle, a.noti_owner AS notiOwner,
                          DATE_FORMAT(a.start_date, '%Y-%m-%d') AS startDate,
                          DATE_FORMAT(a.end_date, '%Y-%m-%d') AS endDate,
                          b.send_result AS sendResult
                          FROM t_notice a
                          INNER JOIN t_notice_send b
                          ON a.idx = b.idx 
                                AND (DATE(a.start_date) >= '${defaultStartDate} ${startDate}' AND (DATE(a.end_date) <= '${defaultEndDate} ${endDate}'))
                                AND a.noti_type ${defaultNotiTypeCondtion} ${notiTypeCondition}
                                AND b.send_result ${defaultSendResultCondition} ${sendResultCondition}
                                AND a.noti_content ${defaultNotiContentCondtion} ${notiContentCondition}
                                GROUP BY a.idx LIMIT ?,?`;

    console.log("sql=>" + sql);
    const data = await pool.query(sql, [Number(start), Number(end)]);
    let list = data[0];

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      list: list,
      paging: paging,
    };
    return res.json(jsonResult);
  } catch (err) {
    return res.status(500).json(err);
  }
});

// 공지사항 상세보기
router.get("/getDetailedNoticeList/:idx", async (req, res, next) => {
  let { serviceKey = "", idx = "" } = req.query;
  console.log(serviceKey, idx);

  try {
    const updateSQL = `UPDATE t_notice_send SET send_result = 'Y' WHERE idx = ?`;
    const updateSQLData = await pool.query(updateSQL, [idx]);
    console.log("updateSQLData: " + updateSQLData);

    const sql = `SELECT a.noti_title AS notiTitle, a.noti_content AS notiContent, 
                          DATE_FORMAT(a.start_date, '%Y-%m-%dT%h:%m') AS startDate, 
                          DATE_FORMAT(a.end_date, '%Y-%m-%dT%h:%m ') AS endDate, 
                          b.send_result AS sendResult, a.noti_type AS notiType,
                          a.file_name AS fileName
                   FROM t_notice a
                   INNER JOIN t_notice_send b
                   WHERE a.idx = b.idx AND a.idx = ? 
                   LIMIT 1`;
    const data = await pool.query(sql, [idx]);
    console.log("sql: " + sql);
    let resultList = data[0];

    if (resultList.length > 0) {
      notiTitle = resultList[0].notiTitle;
      notiContent = resultList[0].notiContent;
      startDate = resultList[0].startDate;
      endDate = resultList[0].endDate;
      sendResult = resultList[0].sendResult;
      notiType = resultList[0].notiType;
      fileName = resultList[0].fileName;
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      notiTitle,
      notiContent,
      startDate,
      endDate,
      sendResult,
      notiType,
      fileName,
    };
    console.log(jsonResult);
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// 공지사항 등록 (개별, 전체)
router.post("/postNotice", async (req, res, next) => {
  let {
    serviceKey = "serviceKey", // 서비스 인증키
    dongCode = "", //     동코드
    hoCode = "", //       호코드
    notiType = "", //     공지 타입
    notiTitle = "", //    공지 제목
    notiContent = "", //  공지 내용
    startDate = "", //    공지 시작일
    endDate = "", //      공지 종료일
    notiOwer = "관리사무소", // 공지 주체
  } = req.body;

  console.log(
    serviceKey,
    dongCode,
    hoCode,
    notiType,
    notiTitle,
    notiContent,
    startDate,
    endDate,
    notiOwer
  );
  let filePath = "public/notice/" + (await listDir());
  try {
    let _notiType = "";
    if (notiType == "Y") {
      _notiType = "전체";
    } else if (notiType == "N") {
      _notiType = "개별";
    }
    let noticeSQL = `INSERT INTO t_notice(noti_type, noti_title, noti_content, start_date, end_date, noti_owner, insert_date, user_id, new_flag, file_path, file_name)
                 VALUES('${_notiType}','${notiTitle}','${notiContent}', DATE_FORMAT('${startDate}',"%y-%m-%d"),DATE_FORMAT('${endDate}',"%y-%m-%d"),'${notiOwer}',now(), "9999",'N', '${filePath}', '${await listDir()}')`;
    console.log("noticeSQL=>" + noticeSQL);
    const data = await pool.query(noticeSQL);

    // 제일 최근에 추가된 공지사항의 idx값을 불러온다
    let getIdxSQL = `SELECT idx as idx FROM t_notice ORDER BY idx DESC LIMIT 1`;
    const getIdx = await pool.query(getIdxSQL);
    console.log("getIdx: " + getIdx[0][0].idx);
    ////////////////////////////////////////

    const arr2 = Array.from(Array(hoCode.length), () => Array(3).fill(null));
    // idx, dongCode, hoCode 순으로 배열에 입력 해야함
    for (i = 0; i < arr2.length; ++i) {
      for (j = 0; j < 3; ++j) {
        arr2[i][0] = getIdx[0][0].idx;
        arr2[i][1] = dongCode;
        arr2[i][2] = hoCode[i];
      }
    }

    let values = arr2;
    /**
     * 입력되는 Data Format 예시
     *[1376525, "101", "101"],
      [1376525, "101", "102"],
      [1376525, "101", "103"],
     * 
     */
    console.log(values);

    let sql = "";
    let sqlBody = "";
    // 공지사항 전체 등록
    if (dongCode == "ALL" && hoCode == "ALL") {
      sql += `LIKE '%'`;

      sqlBody += `INSERT INTO t_notice_send(idx, dong_code, ho_code)
      SELECT a.idx, b.dong_code, b.ho_code
      FROM t_notice a, t_dongho b
      WHERE idx = ${getIdx[0][0].idx} AND b.dong_code ${sql}`;
      const data1 = await pool.query(sqlBody);
      console.log("sqlBody: " + sqlBody);
    } else if (dongCode != "ALL" && hoCode == "ALL") {
      // 동만 개별 등록시 (예: 102동 전체 세대에 공지사항 전송)
      sql += `= ${dongCode}`;

      sqlBody += `INSERT INTO t_notice_send(idx, dong_code, ho_code)
      SELECT a.idx, b.dong_code, b.ho_code
      FROM t_notice a, t_dongho b
      WHERE idx = ${getIdx[0][0].idx} AND b.dong_code ${sql}`;
      const data2 = await pool.query(sqlBody);
      console.log("sqlBody: " + sqlBody);
    } else if (dongCode != "ALL" && hoCode != "ALL") {
      // 특정 동/호 개별 등록시
      sqlBody += `INSERT INTO t_notice_send (idx, dong_code, ho_code) VALUES ?`;
      const data3 = await pool.query(sqlBody, [values], function (err) {
        if (err) throw err;
        console.log(err);
        pool.end();
      });
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };

    return res.json(jsonResult);
  } catch (err) {
    console.log("test===============" + err);
    return res.status(500).json(err);
  }
});

// 공지사항 수정
router.put("/updateNotice", async (req, res, next) => {
  let { serviceKey = "", idx = 0, notiTitle = "", notiContent = "" } = req.body;
  console.log(serviceKey, idx, notiTitle, notiContent);

  try {
    let updateSQL = `UPDATE t_notice 
                     SET noti_title = '${notiTitle}', noti_content = '${notiContent}', file_name = '${await listDir()}', file_path = '${await listDir()}'
                     WHERE idx = ${idx}`;
    console.log("updateSQL: " + updateSQL);
    const updateData = await pool.query(updateSQL);

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
    };
    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

// // 공지사항 삭제
router.delete("/deleteNotice/:idx", async (req, res) => {
  let { serviceKey = "", idx = 0 } = req.params;
  console.log(idx);

  try {
    // 월패드 알림이 Y 이면 삭제 불가
    // const checkNotiTypeSQL = `SELECT send_result AS sendResult FROM t_notice_send WHERE idx = ?`;
    // console.log("checkNotiTypeSQL: " + checkNotiTypeSQL);
    // const data = await pool.query(checkNotiTypeSQL, [idx]);
    // console.log(data[0][0].sendResult);
    // if (data[0][0].sendResult === "Y") {
    //   return res.json({
    //     resultCode: "08",
    //     resultMsg: "이미 등록된 공지사항 입니다.",
    //   });
    // }

    const sql = `DELETE FROM t_notice_send WHERE idx = ?`;
    console.log("sql: " + sql);
    const data2 = await pool.query(sql, [idx]);

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

// const express = require("express");
// const router = express.Router();
// const pool = require("../database/pool");

// /****************************************************
//  * 공지사항 조회
//  ***************************************************/
// router.get("/getNoticeList", async (req, res, next) => {
//   let {
//     // serviceKey = "111111111", // 서비스 인증키
//     size = 10, //           페이지 당 결과수
//     page = 1, //               페이지 번호
//     startDate = "",
//     endDate = "",
//     notiType = "",
//     sendResult = "",
//     notiTitle = "",
//   } = req.query;

//   console.log(
//     // serviceKey,
//     size,
//     page,
//     startDate,
//     endDate,
//     notiType,
//     sendResult,
//     notiTitle
//   );

//   // if ((await checkServiceKeyResult(serviceKey)) == false) {
//   //   return res.json({
//   //     resultCode: "30",
//   //     resultMsg: "등록되지 않은 서비스키 입니다.",
//   //   });
//   // }

//   let totalCount = 0;
//   let block = 10;
//   let total_page = 0;
//   let start = 0;
//   let end = size;
//   let start_page = 1;
//   let end_page = block;

//   try {
//     let sql2 = `SELECT count(*) as cnt
//     FROM t_notice a
//     INNER JOIN t_notice_send b
//     WHERE 1=1 `;

//     //조회문 생성
//     let sql = `SELECT a.idx AS idx, ROW_NUMBER() OVER(ORDER BY a.idx) AS No, DATE_FORMAT(a.start_date, '%Y-%m-%d') AS startDate, DATE_FORMAT(a.end_date, '%Y-%m-%d') AS endDate,
//                       a.noti_type AS notiType, a.noti_title AS notiTitle, a.noti_owner AS notiOwner,
//                       b.send_result AS sendResult
//                FROM t_notice a
//                INNER JOIN t_notice_send b
//                WHERE 1=1 `;

//     console.log("sql: " + sql);

//     //기존 조건 조회문 생성
//     let BasicCondition = "";

//     if (startDate) {
//       //startDate가 존재할때만 where 조건 생성
//       BasicCondition += `AND DATE(a.start_date) >= '${startDate}'`;
//     } else {
//       BasicCondition += `AND DATE(a.start_date) >= "1900-01-01"`;
//     }

//     if (endDate) {
//       //endDate가 존재할때만 where 조건 생성
//       BasicCondition += `AND DATE(a.start_date) <= '${endDate}'`;
//     } else {
//       BasicCondition += `AND DATE(a.start_date) <= "3000-12-31"`;
//     }

//     if (notiType) {
//       // 동과 호는 개별 독립 조건
//       BasicCondition += `AND a.noti_type = '${notiType}'`;
//     }

//     if (sendResult) {
//       // 동과 호는 따로 개별 독립 조건
//       BasicCondition += `AND b.send_result = '${sendResult}'`;
//     }

//     if (notiTitle) {
//       // 동과 호는 따로 개별 독립 조건
//       BasicCondition += `AND a.noti_title = '${notiTitle}'`;
//     }

//     // BasicCondition += ` ORDER BY idx DESC LIMIT ?, ? `;

//     //조건문 취합
//     sql += BasicCondition;

//     sql += ` ORDER BY idx DESC LIMIT ?, ? `;

//     //조회 갯수 생성용 조건문
//     sql2 += BasicCondition;

//     const data2 = await pool.query(sql2);

//     totalCount = data2[0][0].cnt; //총 게시글 수
//     total_page = Math.ceil(totalCount / size); //총 페이지 수

//     start = (page - 1) * size; //시작행
//     start_page = page - ((page - 1) % block);
//     end_page = start_page + block - 1;

//     console.log("start=%d", start);
//     console.log("end=%d", end);
//     if (total_page < end_page) end_page = total_page;

//     let paging = {
//       totalCount,
//       total_page,
//       page,
//       start_page,
//       end_page,
//       ipp: size,
//     };
//     const data = await pool.query(sql, [Number(start), Number(end)]);

//     let list = data[0];

//     let jsonResult = {
//       resultCode: "00",
//       list: list,
//       paging: paging,
//     };
//     return res.json(jsonResult);
//   } catch (error) {
//     return res.status(500).json(error);
//   }
// });

// /****************************************************
//  * 공지사항 상세보기
//  ***************************************************/

// router.get("/getDetailedNoticeList/:idx", async (req, res, next) => {
//   let { idx = 0 } = req.params;
//   console.log(idx);
//   try {
//     // const updateSQL = `UPDATE t_notice_send SET send_result = 'Y' WHERE idx = ?`;
//     // const updateSQLData = await pool.query(updateSQL, [idx]);
//     // console.log("updateSQLData: " + updateSQLData);

//     const detailsql = `SELECT a.idx AS idx, a.noti_title AS notiTitle, a.noti_content AS notiContent,
//                          DATE_FORMAT(a.start_date, '%Y-%m-%d') AS startDate, DATE_FORMAT(a.end_date, '%Y-%m-%d') AS endDate,
//                          b.send_result AS sendResult, a.noti_type AS notiType
//                   FROM t_notice a
//                   INNER JOIN t_notice_send b
//                   WHERE a.idx = b.idx AND a.idx = ?`;
//     const data = await pool.query(detailsql, [idx]);
//     // let test = data[0];
//     // console.log(typeof test[0].endDate);
//     // console.log(test[0].endDate.length);

//     // let myTime = new Date();
//     // let mySeconds = myTime.getSeconds();
//     // console.log(typeof mySeconds.length);
//     // // if(mySeconds.length)
//     console.log("sql: " + detailsql);

//     let notiTitle = "";
//     let startDate = "";
//     let endDate = "";
//     let sendResult = "";
//     let notiType = "";
//     let notiContent = "";

//     let resultList = data[0];

//     console.log("data[0] :" + data[0]);

//     if (resultList.length > 0) {
//       notiTitle = resultList[0].notiTitle;
//       startDate = resultList[0].startDate;
//       endDate = resultList[0].endDate;
//       sendResult = resultList[0].sendResult;
//       notiType = resultList[0].notiType;
//       notiContent = resultList[0].notiContent;
//     }

//     let jsonResult = {
//       resultCode: "00",
//       resultMsg: "NORMAL_SERVICE",
//       notiTitle,
//       startDate,
//       endDate,
//       sendResult,
//       notiType,
//       notiContent,
//     };

//     return res.json(jsonResult);
//   } catch (error) {
//     return res.status(500).json(error);
//   }
// });

// /****************************************************
//  * 공지사항 등록
//  ***************************************************/

// router.post("/postNotice", async (req, res, next) => {
//   let {
//     dongCode = "", //     동코드
//     hoCode = "", //       호코드
//     notiType = "", //     공지 타입
//     notiTitle = "", //    공지 제목
//     notiContent = "", //  공지 내용
//     startDate = "", //    공지 시작일
//     endDate = "", //      공지 종료일
//     notiOwer = "", //     공지 주체
//   } = req.body;
//   console.log(
//     dongCode,
//     hoCode,
//     notiType,
//     notiTitle,
//     notiContent,
//     startDate,
//     endDate,
//     notiOwer
//   );
//   try {
//     let sql = `INSERT INTO t_notice(noti_type, noti_title, noti_content, start_date, end_date, noti_owner, insert_date, user_id, new_flag)
//                VALUES(?,?,?,? + current_time(),DATE_FORMAT(?,"%y-%m-%d"),?,now(),'8888','N')`;
//     console.log("sql=>" + sql);
//     const data = await pool.query(sql, [
//       notiType,
//       notiTitle,
//       notiContent,
//       startDate,
//       endDate,
//       notiOwer,
//     ]);

//     let countSQL = `SELECT ho_code AS hoCode, (SELECT COUNT(ho_code) AS hCount FROM t_dongho WHERE dong_code = ?) AS hCount
//                     FROM t_dongho WHERE dong_code = ?`;
//     console.log("countSQL: " + countSQL);
//     const countData = await pool.query(countSQL, [dongCode, dongCode]);
//     console.log(countData[0]);

//     let getIdxSQL = `SELECT idx as idx FROM t_notice ORDER BY idx DESC LIMIT 1`;
//     const getIdx = await pool.query(getIdxSQL);
//     console.log("getIdx: " + getIdx[0][0].idx);

//     let insertNoticeSendSQL = `INSERT INTO t_notice_send(idx, ho_code, dong_code, send_time, send_result)
//                                VALUES(?,?,?,now(),'N')`;

//     if (notiType == "개별") {
//       const noticeSendData = await pool.query(insertNoticeSendSQL, [
//         getIdx[0][0].idx,
//         hoCode,
//         dongCode,
//       ]);
//     } else if (notiType == "전체") {
//       for (i = 0; i < countData[0][0].hCount; i++) {
//         const notiData = await pool.query(insertNoticeSendSQL, [
//           getIdx[0][0].idx,
//           countData[0][i].hoCode,
//           dongCode,
//         ]);
//       }
//     }

//     let jsonResult = {
//       resultCode: "00",
//       resultMsg: "NORMAL_SERVICE",
//     };

//     return res.json(jsonResult);
//   } catch (err) {
//     console.log("test===============" + err);
//     return res.status(500).json(err);
//   }
// });

// /****************************************************
//  * 공지사항 수정
//  ****************************************************/

// router.put("/updateNotice", async (req, res, next) => {
//   let { idx = 0, notiTitle = "", notiContent = "" } = req.body;
//   console.log(idx, notiTitle, notiContent);

//   try {
//     // 월패드 알림이 Y 이면 수정 불가
//     const checkNotiTypeSQL = `SELECT send_result AS sendResult FROM t_notice_send WHERE idx = ?`;
//     console.log("checkNotiTypeSQL: " + checkNotiTypeSQL);
//     const data = await pool.query(checkNotiTypeSQL, [idx]);
//     console.log(data[0][0].sendResult);
//     if (data[0][0].sendResult === "Y") {
//       return res.json({
//         resultCode: "08",
//         resultMsg: "이미 등록된 공지사항 입니다.",
//       });
//     }

//     const sql = `UPDATE t_notice SET noti_title = ?, noti_content = ? WHERE idx = ?`;
//     console.log("sql: " + sql);
//     const data2 = await pool.query(sql, [notiTitle, notiContent, idx]);

//     let jsonResult = {
//       resultCode: "00",
//       resultMsg: "NORMAL_SERVICE",
//     };

//     return res.json(jsonResult);
//   } catch (error) {
//     return res.status(500).json(error);
//   }
// });

// /****************************************************
//  * 공지사항 삭제
//  ***************************************************/

// router.delete("/deleteNotice", async (req, res) => {
//   let { idx = "" } = req.body;

//   console.log(idx);

//   try {
//     // 월패드 알림이 Y 이면 삭제 불가
//     const checkNotiTypeSQL = `SELECT idx, send_result AS sendResult
//                               FROM t_notice_send
//                               WHERE idx = ?`;

//     console.log("checkNotiTypeSQL: " + checkNotiTypeSQL);

//     const data = await pool.query(checkNotiTypeSQL, [idx]);

//     console.log(data[0][0].sendResult);

//     if (data[0][0].sendResult === "Y") {
//       return res.json({
//         resultCode: "08",
//         resultMsg: "이미 등록된 공지사항 입니다.",
//       });
//     }

//     const sql = `DELETE FROM t_notice_send WHERE idx = ?`;
//     console.log("sql: " + sql);
//     const data2 = await pool.query(sql, [idx]);

//     let jsonResult = {
//       resultCode: "00",
//       resultMsg: "NORMAL_SERVICE",
//     };
//     return res.json(jsonResult);
//   } catch (error) {
//     return res.status(500).json(error);
//   }
// });

// module.exports = router;
