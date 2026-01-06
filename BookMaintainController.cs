using BookSystem.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Reflection;

namespace BookSystem.Controllers
{
    [Route("api/bookmaintain")]
    [ApiController]
    public class BookMaintainController : ControllerBase
    {
        
        [HttpPost]
        [Route("addbook")]
        public IActionResult AddBook([FromBody] Book book)
        {
            
            try
            {
                if (ModelState.IsValid)
                {
                    BookService bookService = new BookService();
                    bookService.AddBook(book);
                    return Ok(
                        new ApiResult<string>()
                        {
                            Data = string.Empty,
                            Status = true,
                            Message = string.Empty
                        });
                }
                else
                {
                    return BadRequest(ModelState);
                }

            }
            catch (Exception)
            {
                return Problem(); 
            }
        }
        [HttpPost()]
        [Route("querybook")]
        public IActionResult QueryBook([FromBody] BookQueryArg arg) 
        {
            try
            {
                BookService bookService = new BookService();
                var list = bookService.QueryBook(arg);

                // 將 List 包裝在 Data 屬性中，與前端 schema.data 對齊
                return Ok(new { data = list });
            }
            catch (Exception)
            {
                return Problem();
            }
        }

        [HttpPost()]
        [Route("loadbook")]
        public IActionResult GetBookById([FromBody] int bookId)
        {
            try
            {
                BookService bookService = new BookService();
                // 呼叫 Service 取得真實資料
                Book bookData = bookService.GetBookById(bookId);

                if (bookData == null)
                {
                    return Ok(new ApiResult<Book> { Status = false, Message = "找不到該書籍資料" });
                }

                ApiResult<Book> result = new ApiResult<Book>
                {
                    Data = bookData,
                    Status = true,
                    Message = string.Empty
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                // 實務上建議記錄 
                return Problem("取得書籍明細時發生錯誤");
            }
        }

        //TODO:UpdateBook()
        [HttpPost()]
        [Route("updatebook")]
        public IActionResult UpdateBook([FromBody] Book book)
        {
            try
            {
                // 這裡會觸發您在 Book.cs 寫的 IValidatableObject 動態驗證
                if (ModelState.IsValid)
                {
                    BookService bookService = new BookService();
                    bookService.UpdateBook(book);
                    return Ok(new ApiResult<string>() { Status = true });
                }
                else
                {
                    return BadRequest(ModelState); // 驗證失敗回傳 400
                }
            }
            catch (Exception ex)
            {
                // 這樣前端 AJAX 的 error 區塊就能看到具體的 SQL 錯誤訊息
                return Problem(ex.Message + " | " + ex.InnerException?.Message);
            }
        }

        [HttpPost()]
        [Route("deletebook")]
        public IActionResult DeleteBookById([FromBody] int bookId)
        {
            try
            {
                BookService bookService = new BookService();
                string errorMessage = bookService.DeleteBookById(bookId);

                if (string.IsNullOrEmpty(errorMessage))
                {
                    return Ok(new ApiResult<string> { Status = true });
                }
                else
                {
                    return Ok(new ApiResult<string> { Status = false, Message = errorMessage });
                }
            }
            catch (Exception ex)
            {
                return Problem("刪除失敗：" + ex.Message);
            }
        }

        //TODO:booklendrecord
        [HttpPost()]
        [Route("getbooklendrecord")]
        public IActionResult GetBookLendRecord([FromBody] int bookId)
        {
            try
            {
                BookService bookService = new BookService();
                // 使用強型別 List
                var list = bookService.GetBookLendRecord(bookId);

                return Ok(new ApiResult<List<BookLendRecord>>()
                {
                    Data = list,
                    Status = true,
                    Message = string.Empty
                });
            }
            catch (Exception ex)
            {
                return Ok(new ApiResult<string> { Status = false, Message = "伺服器發生錯誤" });
            }
        }
    }
}
