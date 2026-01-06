using Dapper;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Data.SqlClient;
using System.ComponentModel;

namespace BookSystem.Model
{
    public class BookService
    {
        /// <summary>
        /// 取得預設連線字串
        /// </summary>
        /// <returns></returns>
        private string GetDBConnectionString()
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .Build();

            return config.GetConnectionString("DBConn");
        }

        /// <summary>
        /// 配合 Kendo Grid 查詢書籍資料
        /// </summary>
        public List<Book> QueryBook(BookQueryArg arg)
        {
            var result = new List<Book>();
            using (SqlConnection conn = new SqlConnection(GetDBConnectionString()))
            {
                //  (欄位 = @參數 OR @參數 = '') 處理動態條件
                string sql = @"
                    SELECT 
                        B.BOOK_ID AS BookId,
                        BC.BOOK_CLASS_NAME AS BookClassName,
                        B.BOOK_NAME AS BookName,
                        CONVERT(VARCHAR, B.BOOK_BOUGHT_DATE, 23) AS BookBoughtDate,
                        BS.CODE_NAME AS BookStatusName,
                        M.USER_CNAME AS BookKeeperCname
                    FROM BOOK_DATA B
                    LEFT JOIN BOOK_CLASS BC ON B.BOOK_CLASS_ID = BC.BOOK_CLASS_ID
                    LEFT JOIN BOOK_CODE BS ON B.BOOK_STATUS = BS.CODE_ID AND BS.CODE_TYPE = 'BOOK_STATUS'
                    LEFT JOIN MEMBER_M M ON B.BOOK_KEEPER = M.USER_ID
                    WHERE (B.BOOK_NAME LIKE '%' + @BookName + '%' OR @BookName = '')
                      AND (B.BOOK_CLASS_ID = @BookClassId OR @BookClassId = '')
                      AND (B.BOOK_KEEPER = @BookKeeperId OR @BookKeeperId = '')
                      AND (B.BOOK_STATUS = @BookStatusId OR @BookStatusId = '')
                    ORDER BY B.BOOK_ID DESC";

                // 建立 Dictionary 存放參數
                // 處理 null 值以避免 SQL 執行錯誤
                Dictionary<string, object> parameter = new Dictionary<string, object>();
                parameter.Add("@BookName", arg.BookName ?? "");
                parameter.Add("@BookClassId", arg.BookClassId ?? "");
                parameter.Add("@BookKeeperId", arg.BookKeeperId ?? "");
                parameter.Add("@BookStatusId", arg.BookStatusId ?? "");

                // 執行查詢並回傳 List
                result = conn.Query<Book>(sql, parameter).ToList();
            }
            return result;
        }

        public void AddBook(Book book)
        {
            using (SqlConnection conn = new SqlConnection(GetDBConnectionString()))
            {
                // 不包含 BOOK_ID，由資料庫自動遞增產生
                // 狀態預設為 'A'，借閱人預設為 NULL
                string sql = @"
            Insert Into BOOK_DATA
            (
                BOOK_NAME, BOOK_CLASS_ID,
                BOOK_AUTHOR, BOOK_BOUGHT_DATE,
                BOOK_PUBLISHER, BOOK_NOTE,
                BOOK_STATUS, BOOK_KEEPER,
                BOOK_AMOUNT,
                CREATE_DATE, CREATE_USER, MODIFY_DATE, MODIFY_USER
            )
            Select 
                @BOOK_NAME, @BOOK_CLASS_ID,
                @BOOK_AUTHOR, @BOOK_BOUGHT_DATE,
                @BOOK_PUBLISHER, @BOOK_NOTE,
                'A', NULL, -- 初始狀態設定
                0 As BOOK_AMOUNT,
                GetDate() As CREATE_DATE, 'Admin' As CREATE_USER, 
                GetDate() As MODIFY_DATE, 'Admin' As MODIFY_USER";

                Dictionary<string, Object> parameter = new Dictionary<string, object>();
                parameter.Add("@BOOK_NAME", book.BookName);
                parameter.Add("@BOOK_CLASS_ID", book.BookClassId);

                // 確保其餘欄位即便沒傳值也有基本字串，避免 SQL 錯誤
                parameter.Add("@BOOK_AUTHOR", book.BookAuthor ?? "");
                parameter.Add("@BOOK_BOUGHT_DATE", book.BookBoughtDate ?? DateTime.Now.ToString("yyyy/MM/dd"));
                parameter.Add("@BOOK_PUBLISHER", book.BookPublisher ?? "");
                parameter.Add("@BOOK_NOTE", book.BookNote ?? "");

                conn.Execute(sql, parameter);
            }
        }


        public void UpdateBook(Book book)
        {
            using (SqlConnection conn = new SqlConnection(GetDBConnectionString()))
            {
                conn.Open();
                using (var transaction = conn.BeginTransaction())
                {
                    try
                    {
                        // 取得舊資料
                        Book oldBook = GetBookById(book.BookId);
                        if (oldBook == null) throw new Exception("找不到該書籍資料");

                        // 去除空白字元，確保狀態比對正確
                        string oldStatus = (oldBook.BookStatusId ?? "").Trim();
                        string newStatus = (book.BookStatusId ?? "").Trim();
                        string oldKeeper = (oldBook.BookKeeperId ?? "").Trim();
                        string newKeeper = (book.BookKeeperId ?? "").Trim();

                        // 更新書籍主檔 BOOK_DATA
                        string updateBookSql = @"
                    UPDATE BOOK_DATA
                    SET BOOK_NAME = @BOOK_NAME, BOOK_CLASS_ID = @BOOK_CLASS_ID,
                        BOOK_AUTHOR = @BOOK_AUTHOR, BOOK_BOUGHT_DATE = @BOOK_BOUGHT_DATE,
                        BOOK_PUBLISHER = @BOOK_PUBLISHER, BOOK_NOTE = @BOOK_NOTE,
                        BOOK_STATUS = @BOOK_STATUS, BOOK_KEEPER = @BOOK_KEEPER,
                        MODIFY_DATE = GETDATE(), MODIFY_USER = @USER
                    WHERE BOOK_ID = @BOOK_ID";

                        var bookParam = new Dictionary<string, object>();
                        bookParam.Add("@BOOK_NAME", book.BookName);
                        bookParam.Add("@BOOK_CLASS_ID", book.BookClassId);
                        bookParam.Add("@BOOK_AUTHOR", book.BookAuthor ?? "");
                        bookParam.Add("@BOOK_BOUGHT_DATE", book.BookBoughtDate);
                        bookParam.Add("@BOOK_PUBLISHER", book.BookPublisher ?? "");
                        bookParam.Add("@BOOK_NOTE", book.BookNote ?? "");
                        bookParam.Add("@BOOK_STATUS", book.BookStatusId);

                        bookParam.Add("@BOOK_KEEPER", string.IsNullOrWhiteSpace(book.BookKeeperId) ? null : book.BookKeeperId);

                        bookParam.Add("@BOOK_ID", book.BookId);
                        bookParam.Add("@USER", string.IsNullOrWhiteSpace(book.BookKeeperId) ? "Admin" : book.BookKeeperId);

                        conn.Execute(updateBookSql, bookParam, transaction);

                        // 判斷借閱紀錄邏輯
                        bool wasLent = (oldStatus == "B" || oldStatus == "C");
                        bool isNowLent = (newStatus == "B" || newStatus == "C");

                        if (isNowLent)
                        {
                            // 檢查資料庫是否已有該書的紀錄筆數
                            string countSql = "SELECT COUNT(*) FROM BOOK_LEND_RECORD WHERE BOOK_ID = @id";
                            int recordCount = conn.ExecuteScalar<int>(countSql, new { id = book.BookId }, transaction);

                            // 情境 1：新借閱 (A/U -> B/C) 或 資料雖然顯示 B/C 但從未有任何紀錄 ( recordCount == 0 )
                            if (!wasLent || recordCount == 0)
                            {
                                // 執行 INSERT
                                string insertSql = @"
                            INSERT INTO BOOK_LEND_RECORD (BOOK_ID, KEEPER_ID, LEND_DATE, CRE_DATE, CRE_USR, MOD_DATE, MOD_USR)
                            VALUES (@BOOK_ID, @KEEPER_ID, GETDATE(), GETDATE(), @KEEPER_ID, GETDATE(), @KEEPER_ID)";
                                conn.Execute(insertSql, new { BOOK_ID = book.BookId, KEEPER_ID = book.BookKeeperId }, transaction);
                            }
                            // 情境 2：續借/修正人選 (原本就是 B/C 且借閱人不同)
                            else if (wasLent && oldKeeper != newKeeper)
                            {
                                // 修改最新的一筆紀錄，此時只會更新 MOD_USR
                                string updateRecordSql = @"
                            UPDATE BOOK_LEND_RECORD 
                            SET KEEPER_ID = @KEEPER_ID, MOD_DATE = GETDATE(), MOD_USR = @KEEPER_ID
                            WHERE IDENTITY_FIELD = (SELECT MAX(IDENTITY_FIELD) FROM BOOK_LEND_RECORD WHERE BOOK_ID = @BOOK_ID)";
                                conn.Execute(updateRecordSql, new { BOOK_ID = book.BookId, KEEPER_ID = book.BookKeeperId }, transaction);
                            }
                        }

                        transaction.Commit();
                    }
                    catch (Exception ex)
                    {
                        transaction.Rollback();
                        throw ex;
                    }
                }
            }
        }


        public string DeleteBookById(int bookId)
        {
            using (SqlConnection conn = new SqlConnection(GetDBConnectionString()))
            {
                conn.Open();
                using (var transaction = conn.BeginTransaction())
                {
                    try
                    {
                        // 先取得書籍資訊確認目前狀態
                        Book book = GetBookById(bookId);
                        if (book == null) return "找不到該書籍資料";

                        // 檢查狀態：只有 A (可以借出) 或 U (不可借出) 才能刪除
                        string status = (book.BookStatusId ?? "").Trim();
                        if (status != "A" && status != "U")
                        {
                            return "該書目前狀態為借出中，不可刪除";
                        }

                        // 刪除該書籍所有的借閱紀錄
                        string deleteRecordSql = @"DELETE FROM BOOK_LEND_RECORD WHERE BOOK_ID = @BOOK_ID";
                        conn.Execute(deleteRecordSql, new { BOOK_ID = bookId }, transaction);

                        // 刪除書籍主檔
                        string deleteBookSql = @"DELETE FROM BOOK_DATA WHERE BOOK_ID = @BOOK_ID";
                        conn.Execute(deleteBookSql, new { BOOK_ID = bookId }, transaction);

                        transaction.Commit(); // 確認執行
                        return "";
                    }
                    catch (Exception ex)
                    {
                        transaction.Rollback(); // 發生錯誤則回滾
                        throw ex;
                    }
                }
            }
        }

        /// <summary>
        /// 根據書籍 ID 取得完整書籍資料
        /// </summary>
        /// <param name="bookId">書籍編號</param>
        /// <returns>書籍詳細資料物件</returns>
        public Book GetBookById(int bookId)
        {
            Book result = null;
            using (SqlConnection conn = new SqlConnection(GetDBConnectionString()))
            {
                // 對應到 Book 類別的屬性
                string sql = @"
            SELECT 
                B.BOOK_ID AS BookId,
                B.BOOK_NAME AS BookName,
                B.BOOK_CLASS_ID AS BookClassId,
                B.BOOK_AUTHOR AS BookAuthor,
                B.BOOK_PUBLISHER AS BookPublisher,
                B.BOOK_NOTE AS BookNote,
                CONVERT(VARCHAR, B.BOOK_BOUGHT_DATE, 23) AS BookBoughtDate,
                B.BOOK_STATUS AS BookStatusId,
                B.BOOK_KEEPER AS BookKeeperId
            FROM BOOK_DATA B
            WHERE B.BOOK_ID = @BookId";

                // 建立參數字典
                Dictionary<string, object> parameter = new Dictionary<string, object>();
                parameter.Add("@BookId", bookId);

                // 查詢 (使用 QueryFirstOrDefault，因為 ID 是唯一的)
                result = conn.QueryFirstOrDefault<Book>(sql, parameter);
            }
            return result;
        }

        public List<BookLendRecord> GetBookLendRecord(int bookId)
        {
            using (SqlConnection conn = new SqlConnection(GetDBConnectionString()))
            {
                string sql = @"
            SELECT 
                CONVERT(VARCHAR, LR.LEND_DATE, 111) AS LendDate,
                LR.KEEPER_ID AS BookKeeperId,
                M.USER_ENAME AS BookKeeperEname,
                M.USER_CNAME AS BookKeeperCname
            FROM BOOK_LEND_RECORD LR
            INNER JOIN MEMBER_M M ON LR.KEEPER_ID = M.USER_ID
            WHERE LR.BOOK_ID = @BookId
            ORDER BY LR.LEND_DATE DESC";

                var parameter = new { BookId = bookId };

                // 使用強型別 BookLendRecord 進行對應
                return conn.Query<BookLendRecord>(sql, parameter).ToList();
            }
        }
    }
}
