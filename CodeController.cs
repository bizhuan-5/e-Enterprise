using BookSystem.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Dapper;

namespace BookSystem.Controllers
{
    [Route("api/code")]
    [ApiController]
    public class CodeController : ControllerBase
    {
        [Route("bookstatus")]
        [HttpPost]
        public IActionResult GetBookStatusData()
        {
            CodeService codeService = new CodeService();

            var result=new ApiResult<List<Code>>
            {
                Status=true,
                Message=string.Empty,
                Data=codeService.GetBookStatusData()
            };

            return new JsonResult(result);
        }

        // 圖書類別 (對應前端 api/code/bookclass)
        [Route("bookclass")]
        [HttpPost]
        public IActionResult GetBookClassData()
        {
            CodeService codeService = new CodeService();
            var result = new ApiResult<List<Code>>
            {
                Status = true,
                Message = string.Empty,
                Data = codeService.GetBookClassData() 
            };
            return new JsonResult(result);
        }

        // 借閱人名單 (對應前端 api/code/user 或 bookkeeper)
        [Route("user")]
        [HttpPost]
        public IActionResult GetUserData()
        {
            CodeService codeService = new CodeService();
            var result = new ApiResult<List<Code>>
            {
                Status = true,
                Message = string.Empty,
                Data = codeService.GetUserData() 
            };
            return new JsonResult(result);
        }
    }
}
