using Dapper;
using Microsoft.Data.SqlClient;

namespace BookSystem.Model
{
    public class CodeService
    {
        private string GetDBConnectionString()
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .Build();

            return config.GetConnectionString("DBConn");
        }
        public List<Code> GetBookStatusData()
        {
            var result = new List<Code>();
            using (SqlConnection conn = new SqlConnection(GetDBConnectionString()))
            {
                string sql = "Select CODE_ID As Value,CODE_NAME As Text From BOOK_CODE Where CODE_TYPE=@CODE_TYPE";
                Dictionary<string, Object> parameter = new Dictionary<string, object>();
                parameter.Add("@CODE_TYPE", "BOOK_STATUS");
                result = conn.Query<Code>(sql, parameter).ToList();
            }
            return result;
        }

        /// <summary>
        /// 使用 SqlConnection 取得圖書類別
        /// </summary>
        public List<Code> GetBookClassData()
        {
            var result = new List<Code>();
            using (SqlConnection conn = new SqlConnection(GetDBConnectionString()))
            {
                // 定義 SQL 指令，使用 AS 對應到模型屬性
                string sql = @"SELECT BOOK_CLASS_ID AS Value, 
                              BOOK_CLASS_NAME AS Text 
                       FROM BOOK_CLASS 
                       ORDER BY BOOK_CLASS_ID";

                // 建立參數字典 (目前無特定篩選條件，可留空或為日後擴充準備)
                Dictionary<string, object> parameter = new Dictionary<string, object>();

                // 執行 Dapper 查詢並轉為 List
                result = conn.Query<Code>(sql, parameter).ToList();
            }
            return result;
        }

        /// <summary>
        /// 使用 SqlConnection 取得人員/借閱人清單
        /// </summary>
        public List<Code> GetUserData()
        {
            var result = new List<Code>();
            using (SqlConnection conn = new SqlConnection(GetDBConnectionString()))
            {
                // 定義 SQL 指令
                string sql = @"SELECT USER_ID AS Value, 
                              USER_CNAME AS Text 
                       FROM MEMBER_M 
                       ORDER BY USER_ID";

                // 建立參數字典
                Dictionary<string, object> parameter = new Dictionary<string, object>();

                // 執行 Dapper 查詢
                result = conn.Query<Code>(sql, parameter).ToList();
            }
            return result;
        }
    }
}
