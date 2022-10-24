const express = require("express");
const router = express.Router();
const pool = require("../database/pool");

/****************************************************
 * 주요 연락처 목록 조회
 ***************************************************/
router.get("/getKeyContract", async (req, res, next) => {
  let {
    // serviceKey = "111111111", // 서비스 인증키
    size = 10, // 페이지 당 결과수
    page = 1, // 페이지 번호
    contractFlag = "",
  } = req.query;

  console.log("=====주요연락처 목록조회=====");
  console.log(
    // serviceKey,
    size,
    page,
    contractFlag
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
    let _contractFlag = "";

    if (contractFlag) {
      _contractFlag = `${contractFlag}`;
      console.log(_contractFlag);
    }

    let sql2 = `SELECT count(*) as cnt 
                FROM t_key_contact 
                WHERE 1=1 `;

    //조회문 생성
    let sql = `SELECT idx as idx, ROW_NUMBER() OVER(ORDER BY idx) AS No, contact_flag AS contractFlag, 
                      facility_name AS facilityName, phone_num AS phoneNum,
                      DATE_FORMAT(insert_dtime, '%Y-%m-%d') AS insertDTime
               FROM t_key_contact
               WHERE contact_flag IN ('${_contractFlag}') 
               ORDER BY idx DESC LIMIT ?, ?`;

    console.log("sql: " + sql);

    // // 기존 조건 조회문 생성
    // let BasicCondition = ${contractFlag};

    // if (contractFlag) {
    //   //contractFlag가 존재할때만 where 조건 생성
    //   BasicCondition += `AND contact_flag = '${contractFlag}'`;
    // }

    // BasicCondition += ` ORDER BY idx DESC LIMIT ?, ? `;

    //조건문 취합
    // sql += BasicCondition;

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
 * 주요 연락처 등록
 ***************************************************/

router.post("/uploadKeyContract", async (req, res, next) => {
  let {
    contractFlag = "",
    facilityName = "",
    phoneNum = "",
    memo = "",
  } = req.body;
  console.log(contractFlag, facilityName, phoneNum, memo);

  let resultCode = "00";
  if (contractFlag === "") resultCode = "10";

  if (facilityName === "") resultCode = "10";

  if (phoneNum === "") resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const sql = `INSERT INTO t_key_contact(phone_num, contact_flag, facility_name, memo, insert_dtime)
                 VALUES(?, ?, ?, ?, now())`;
      const data = await pool.query(sql, [
        phoneNum,
        contractFlag,
        facilityName,
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
 * 주요 연락처 수정
 ***************************************************/

router.patch("/updateKeyContract/:idx", async (req, res, next) => {
  let {
    idx = 0,
    contractFlag = "",
    facilityName = "",
    phoneNum = "",
    memo = "",
  } = req.body;
  console.log(idx, contractFlag, facilityName, phoneNum, memo);

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  if (contractFlag === "") resultCode = "10";
  if (facilityName === "") facilityName = "10";
  if (phoneNum === "") phoneNum = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const sql = `UPDATE t_key_contact 
                   SET contact_flag = ?, facility_name = ?, phone_num = ?, insert_dtime = now(), memo = ? 
                   WHERE idx = ?`;
      console.log("sql: " + sql);
      const data = await pool.query(sql, [
        contractFlag,
        facilityName,
        phoneNum,
        memo,
        idx,
      ]);

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
 * 주요 연락처 삭제
 ***************************************************/

router.delete("/deleteKeyContract/:idx", async (req, res, next) => {
  let { idx = 0 } = req.params;
  console.log(idx);

  let resultCode = "00";
  if (idx === 0) resultCode = "10";

  console.log("resultCode=> " + resultCode);

  if (resultCode === "00") {
    try {
      const sql = `DELETE FROM t_key_contact WHERE idx = ?`;
      console.log("sql: " + sql);
      const data = await pool.query(sql, [idx]);

      let jsonResult = {
        resultCode: "00",
        resultMsg: "연락처가 삭제되었습니다.",
      };

      return res.json(jsonResult);
    } catch (error) {
      return res.status(500).json(error);
    }
  } else return res.json({ resultCode: resultCode });
});

module.exports = router;
