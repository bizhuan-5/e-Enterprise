using Microsoft.Data.SqlClient;
using System.Data;
using Dapper;
using Microsoft.Extensions.Configuration; // 必須引用此項才能使用 ConfigurationBuilder
using System.IO; // 必須引用此項才能使用 Directory
using System.Collections.Generic; // 確保 List<Code> 可使用
using System.Linq; // 確保 .ToList() 可使用

namespace BookSystem.Model
{
    
    public class CodeService
    {
        public List<Code>GetBookStatusData()
        {
            var result = new List<Code>();
            result.Add(new Code() { Value = "A", Text = "可以借出" });
            result.Add(new Code() { Value = "B", Text = "已借出" });
            result.Add(new Code() { Value = "U", Text = "不可借出" });
            result.Add(new Code() { Value = "C", Text = "已借出(未領)" });

            return result;
        }

        public List<Code> GetColorData()
        {
            var result = new List<Code>();
            result.Add(new Code() { Value = "Red", Text = "Red" });
            result.Add(new Code() { Value = "Blue", Text = "Blue" });
            result.Add(new Code() { Value = "Green", Text = "Green" });
            result.Add(new Code() { Value = "Purple", Text = "Purple" });

            return result;
        }

        private string GetDBConnectionString()
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .Build();

            return config.GetConnectionString("DBConn");
        }

        /// <summary>
        /// 使用 SqlConnection 取得圖書類別
        /// </summary>
        public List<Code> GetBookClassData()
        {
            using (SqlConnection db = new SqlConnection(GetDBConnectionString()))
            {
                // 使用 AS 將資料庫欄位對應到 Code 模型的 Value 與 Text 屬性
                string sql = @"SELECT BOOK_CLASS_ID AS Value, 
                                      BOOK_CLASS_NAME AS Text 
                               FROM BOOK_CLASS 
                               ORDER BY BOOK_CLASS_ID";

                return db.Query<Code>(sql).ToList();
            }
        }

        /// <summary>
        /// 使用 SqlConnection 取得人員/借閱人清單
        /// </summary>
        public List<Code> GetUserData()
        {
            using (SqlConnection db = new SqlConnection(GetDBConnectionString()))
            {
                // 將中文姓名與英文姓名組合顯示，方便使用者辨識
                string sql = @"SELECT USER_ID AS Value, 
                                      USER_CNAME AS Text 
                               FROM MEMBER_M 
                               ORDER BY USER_ID";

                return db.Query<Code>(sql).ToList();
            }
        }
    }
}
