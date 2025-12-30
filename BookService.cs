using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
using Dapper;

namespace BookSystem.Model
{
    public class BookService
    {

        // 取得資料庫連線字串的方法
        private string GetDBConnectionString()
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .Build();

            return config.GetConnectionString("DBConn");
        }
        public List<Book> QueryBooks(BookQueryArg arg)
        {
            using (SqlConnection db = new SqlConnection(GetDBConnectionString()))
            {
                string sql = @"
                SELECT 
                    BD.BOOK_ID AS BookId,
                    BD.BOOK_NAME AS BookName,
                    BC.BOOK_CLASS_NAME AS BookClassName,
                    BD.BOOK_BOUGHT_DATE AS BookBoughtDate,
                    BS.CODE_NAME AS BookStatusName,
                    MM.USER_CNAME AS BookKeeperCName
                FROM BOOK_DATA BD
                LEFT JOIN BOOK_CLASS BC ON BD.BOOK_CLASS_ID = BC.BOOK_CLASS_ID
                LEFT JOIN BOOK_CODE BS ON BD.BOOK_STATUS = BS.CODE_ID AND BS.CODE_TYPE = 'BOOK_STATUS'
                LEFT JOIN MEMBER_M MM ON BD.BOOK_KEEPER = MM.USER_ID
                WHERE (BD.BOOK_NAME LIKE @BookName OR @BookName = '')
                  AND (BD.BOOK_CLASS_ID = @BookClassId OR @BookClassId = '')
                  AND (BD.BOOK_KEEPER = @BookKeeperId OR @BookKeeperId = '')
                  AND (BD.BOOK_STATUS = @BookStatus OR @BookStatus = '')";

                return db.Query<Book>(sql, new
                {
                    BookName = string.IsNullOrEmpty(arg.BookName) ? "" : $"%{arg.BookName}%",
                    BookClassId = arg.BookClassId ?? "",
                    BookKeeperId = arg.BookKeeperId ?? "",
                    BookStatus = arg.BookStatusId ?? ""
                }).ToList();
            }
        }
    }
}
