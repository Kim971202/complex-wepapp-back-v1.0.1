const express = require("express");
const router = express.Router();
const pool = require("../database/pool");
// const { upload } = require("../modules/fileUpload");
// const { getServerIp } = require("../modules/ipSearch");

/****************************************************
 * 계약 자료 목록 조회
 ***************************************************/

router.get("/getContractDocList", async (req, res, next) => {
  let {
    // serviceKey = "111111111", // 서비스 인증키
    size = 10, //           페이지 당 결과수
    page = 1, //               페이지 번호
    startDate = "",
    endDate = "",
    contractTitle = "",
  } = req.query;

  console.log(size, page, startDate, endDate, contractTitle);

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
                FROM t_contract_document
                WHERE 1=1 `;

    //조회문 생성
    let sql = `SELECT idx AS idx, ROW_NUMBER() OVER(ORDER BY idx) AS No, contract_title AS contractTitle, 
                      user_id AS userId, DATE_FORMAT(contract_date, '%Y-%m-%d') AS contractDate
              FROM t_contract_document
              WHERE 1=1 `;

    console.log("sql: " + sql);

    //기존 조건 조회문 생성
    let BasicCondition = "";

    let contractTitleCondition = `LIKE '%${contractTitle}%'`;

    if (startDate) {
      //startDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(contract_date) >= '${startDate}'`;
    } else {
      BasicCondition += `AND DATE(contract_date) >= "1900-01-01"`;
    }

    if (endDate) {
      //endDate가 존재할때만 where 조건 생성
      BasicCondition += `AND DATE(contract_date) <= '${endDate}'`;
    } else {
      BasicCondition += `AND DATE(contract_date) <= "3000-12-31"`;
    }

    if (contractTitle) {
      //contractTitle(계약명)는 개별 독립 조건
      BasicCondition += `AND contract_title ${contractTitleCondition}`;
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
 * 계약 자료 상세 조회
 ***************************************************/

router.get("/getDetailedContractDocList/:idx", async (req, res, next) => {
  let { idx = "" } = req.params;
  console.log(idx);

  try {
    const detailsql = `SELECT idx AS idx, contract_title AS contractTitle, DATE_FORMAT(contract_date, '%Y-%m-%d %h:%i:%s') AS contractDate, contract_content AS contractContent, 
                        file_path AS filePath, file_name AS fileName
                  FROM t_contract_document
                  WHERE idx = ?`;

    const data = await pool.query(detailsql, [idx]);

    console.log("sql: " + detailsql);

    let contractTitle = "";
    let contractDate = "";
    let contractContent = "";
    let filePath = "";
    let fileName = "";

    resultList = data[0];

    console.log("data[0] :" + data[0]);

    if (resultList.length > 0) {
      contractTitle = resultList[0].contractTitle;
      contractDate = resultList[0].contractDate;
      contractContent = resultList[0].contractContent;
      filePath = resultList[0].filePath;
      fileName = resultList[0].fileName;
    }

    let jsonResult = {
      resultCode: "00",
      resultMsg: "NORMAL_SERVICE",
      contractTitle,
      contractDate,
      contractContent,
      filePath,
      fileName,
    };

    return res.json(jsonResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

/****************************************************
 * 계약 자료 등록
 ***************************************************/

// router.post(
//   "/uploadContract",
//   upload.single("file"),
//   async (req, res, next) => {
//     let {
//       contractTitle = "",
//       contractDate = "",
//       contractContent = "",
//     } = req.body;

//     let fileName = req.file.originalname;
//     let filePath =
//       `http://${getServerIp()}:3000/` + req.file.destination + fileName;

//     console.log(fileName);

//     try {
//       const sql = `INSERT INTO t_contract_document(contract_date, contract_title, contract_content, file_path, insert_dtime, user_id, file_name)
//                    VALUES(DATE_FORMAT(?,"%y-%m-%d"),?,?,?,now(),?,?)`;
//       console.log("sql: " + sql);
//       const data = await pool.query(sql, [
//         contractTitle,
//         contractDate,
//         contractContent,
//         // userID,
//         fileName,
//         filePath,
//       ]);

//       console.log(data[0]);

//       let jsonResult = {
//         resultCode: "00",
//         resultMsg: "NORMAL_SERVICE",
//       };
//       return res.json(jsonResult);
//     } catch (error) {
//       return res.status(500).json(error);
//     }
//   }
// );

/****************************************************
 * 계약 자료 수정
 ***************************************************/

router.patch("/updateContractDoc/:idx", async (req, res, next) => {
  let {
    idx = "",
    contractTitle = "",
    contractDate = "",
    contractContent = "",
  } = req.body;

  console.log(idx, contractTitle, contractDate, contractContent);

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  if (contractTitle === "") resultCode = "10";
  if (contractDate === "") resultCode = "10";
  if (contractContent === "") resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const editsql = `SELECT contract_title AS contracTitle, contract_content AS contractContent,
                              contract_date AS contractDate
                       FROM t_contract_document
                       WHERE idx = ?`;
      console.log("editsql: " + editsql);
      const data = await pool.query(editsql, [idx]);

      if (!contractTitle) contractTitle = data[0][0].contracTitle;
      if (!contractContent) contractContent = data[0][0].contractContent;

      const sql = `UPDATE t_contract_document SET contract_title = ?, contract_content = ?, contract_date =?
                   WHERE idx = ?`;
      console.log("sql: " + sql);
      const data1 = await pool.query(sql, [
        contractTitle,
        contractContent,
        contractDate,
        idx,
      ]);
      let jsonResult = {
        resultCode: resultCode,
        resultMsg: "수정되었습니다.",
        idx,
      };
      return res.json(jsonResult);
    } catch (error) {
      return res.status(500).json(error);
    }
  } else return res.json({ resultCode: resultCode });
});

/****************************************************
 * 계약자료 삭제
 ***************************************************/

router.delete("/deleteContractDoc/:idx", async (req, res, next) => {
  let { idx = 0 } = req.params;
  console.log(idx);

  try {
    const sql = `DELETE FROM t_contract_document WHERE idx = ?`;
    console.log("sql: " + sql);
    const data = await pool.query(sql, [idx]);
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
