var areaOption={
    "query":"q",
    "detail":"d"
}

var apiRootUrl="https://localhost:7246/api/";
var state="";

var stateOption={
    "add":"add",
    "update":"update"
}

var defauleBookStatusId="A";

$(function () {
    
    registerRegularComponent();

    var validator = $("#book_detail_area").kendoValidator({
        rules:{
            //日期必填驗證
            dateCheckRule: function(input){
                if (input.is(".date_picker")) {
                    var selector=$("#"+$(input).prop("id"));
                    return selector.data("kendoDatePicker").value();
                }
                return true;
            }
        },
        messages: { 
            //日期驗證訊息
            dateCheckRule: function(input){ return input.attr("data-message_prefix")+"格式有誤";}
          }
        }).data("kendoValidator");


    $("#book_detail_area").kendoWindow({
        width: "1200px",
        title: "新增書籍",
        visible: false,
        modal: true,
        actions: [
            "Close"
        ],
        close: onBookWindowClose
    }).data("kendoWindow").center();

    $("#book_record_area").kendoWindow({
        width: "700px",
        title: "借閱紀錄",
        visible: false,
        modal: true,
        actions: [
            "Close"
        ]
    }).data("kendoWindow").center();
    
    //TODO!!
    $("#btn_add_book").click(function (e) {
        e.preventDefault();
        state = stateOption.add;

        // 呼叫上面的清空，讓視窗變成全白狀態
        clear(areaOption.detail); 

        // 實作您的想法，只抓取查詢區(q)的「書名」與「類別」填入明細區(d)
        var qName = $("#book_name_q").val().trim();
        var qClass = $("#book_class_q").data("kendoDropDownList").value();

        if (qName !== "") {
            $("#book_name_d").val(qName); // 帶入書名
        }
        if (qClass !== "") {
            $("#book_class_d").data("kendoDropDownList").value(qClass); // 帶入類別
            onClassChange(); // 同步更換圖片
        }

        // 開啟視窗
        enableBookDetail(true);   
        setStatusKeepRelation();  
        $("#btn-save").show();    
        $("#book_detail_area").data("kendoWindow").open();
    });


    $("#btn_query").click(function (e) {
        e.preventDefault();
        
        var grid=getBooGrid();
        grid.dataSource.read();
    });

    $("#btn_clear").click(function (e) {
        e.preventDefault();

        // 執行清空
        clear(areaOption.query);

        // 重新讀取 Grid (此時 parameterMap 會抓到清空後的數值)
        var grid = getBooGrid();
        if (grid) {
            grid.dataSource.read();
        }
    });

    $("#btn-save").click(function (e) {
        e.preventDefault();
        if (validator.validate()) {
            switch (state) {
                case "add":
                    addBook();
                    break;
                case "update":
                    updateBook($("#book_id_d").val());
                break;
                default:
                    break;
            }
        }        
    });

    $("#book_grid").kendoGrid({
        dataSource: {
            transport: {
                read: {
                    url: apiRootUrl + "bookmaintain/querybook",
                    dataType: "json",
                    type: "post",
                    contentType: "application/json"
                },
                parameterMap: function (data, operation) {
                    if (operation === "read") {
                        // 這裡送出的 Key 必須與 BookQueryArg.cs 的屬性名稱完全一致
                        return JSON.stringify({
                            "BookName": $("#book_name_q").val().trim(),
                            "BookClassId": $("#book_class_q").data("kendoDropDownList") ? $("#book_class_q").data("kendoDropDownList").value() : "",
                            "BookKeeperId": $("#book_keeper_q").data("kendoDropDownList") ? $("#book_keeper_q").data("kendoDropDownList").value() : "",
                            "BookStatusId": $("#book_status_q").data("kendoDropDownList") ? $("#book_status_q").data("kendoDropDownList").value() : ""
                        });
                    }
                }
            },
            schema: {
                data: "data", // 對應 Controller 回傳的 Ok(new { data = list })
                model: {
                    id: "bookId",
                    fields: {
                        bookId: { type: "int" },
                        bookClassName: { type: "string" },
                        bookName: { type: "string" },
                        bookBoughtDate: { type: "string" },
                        bookStatusName: { type: "string" },
                        bookKeeperCname: { type: "string" }
                    }
                }
            },
            pageSize: 20,
            sort: { field: "bookId", dir: "desc" } 
        },
        // 設定高度(約可呈現 7 筆資料 + 標題列 + 分頁列)
        height: 450, 
        // 開啟捲動功能
        scrollable: true, 
        sortable: true,
        pageable: {
            input: true,
            numeric: false,
            refresh: true,
            messages: {
                display: "顯示第 {0} 至 {1} 筆，共 {2} 筆",
                page: "Page",
                of: "of {0}",
                itemsPerPage: "items per page"
            }
        },
        // 調整欄位寬度為固定數值，並整合按鈕
        columns: [
            { field: "bookId", title: "書籍編號", width: "80px" },
            { field: "bookClassName", title: "圖書類別", width: "120px" },
            { 
                field: "bookName", title: "書名", width: "250px",
                template: "<a style='cursor:pointer; color:blue' onclick='showBookForDetail(event,#:bookId #)'>#: bookName #</a>"
            },
            { field: "bookBoughtDate", title: "購書日期", width: "120px" },
            { field: "bookStatusName", title: "借閱狀態", width: "100px" },
            { field: "bookKeeperCname", title: "借閱人", width: "100px" },
            { 
                command: [
                    { text: "借閱紀錄", click: showBookLendRecord },
                    { text: "修改", click: showBookForUpdate },
                    { text: "刪除", click: deleteBook }
                ], 
                title: " ", 
                width: "280px" // 增加寬度以容納三個按鈕
            }
        ]
    });

    $("#book_record_grid").kendoGrid({
        dataSource: {
            data: [],
            schema: {
                model: {
                    fields: {
                        LendDate: { type: "string" },
                        BookKeeperId: { type: "string" },
                        BookKeeperEname: { type: "string" },
                        BookKeeperCname: { type: "string" }
                    }
                }
            },
            pageSize: 20,
        },
        height: 250,
        sortable: true,
        pageable: {
            input: true,
            numeric: false
        },
        columns: [
            { field: "lendDate", title: "借閱日期", width: "10%" },
            { field: "bookKeeperId", title: "借閱人編號", width: "10%" },
            { field: "bookKeeperEname", title: "借閱人英文姓名", width: "15%" },
            { field: "bookKeeperCname", title: "借閱人中文姓名", width: "15%" },
        ]
    });

})

/**
 * 當圖書類別改變時,置換圖片
 */
function onClassChange() {
    // 從明細視窗的下拉選單取得目前的 Value
    var selectedValue = $("#book_class_d").data("kendoDropDownList").value();

    if (selectedValue === "") {
        $("#book_image_d").attr("src", "image/optional.jpg");
    } else {
        // 根據類別代碼顯示對應圖片
        $("#book_image_d").attr("src", "image/" + selectedValue + ".jpg");
    }
}

/**
 * 當 BookWindow 關閉後要處理的作業
 */
function onBookWindowClose() {
    //清空表單內容
    clear(areaOption.detail);
}

//TODO: 已補齊欄位值
function addBook() { 
    var book = {
        "BookName": $("#book_name_d").val().trim(),
        "BookClassId": $("#book_class_d").data("kendoDropDownList").value(),
        "BookAuthor": $("#book_author_d").val().trim(),
        "BookBoughtDate": kendo.toString($("#book_bought_date_d").data("kendoDatePicker").value(), "yyyy-MM-dd"),
        "BookPublisher": $("#book_publisher_d").val().trim(),
        "BookNote": $("#book_note_d").data("kendoEditor").value(),
        
        "BookStatusId": "A", // 預設為「可以借出」
        "BookKeeperId": "",  
        "BookClassName": "", 
        "BookStatusName": "",
        "BookKeeperCname": ""
    };

    $.ajax({
        type: "post",
        url: apiRootUrl + "bookmaintain/addbook",
        data: JSON.stringify(book),
        contentType: "application/json",
        dataType: "json",
        success: function (response) {
            var isSuccess = response.Status || response.status;
            if (isSuccess) {
                alert("新增成功");
                
                // 關閉明細視窗
                $("#book_detail_area").data("kendoWindow").close();

                // 執行查詢區清空邏輯
                clear(areaOption.query); 

                // 重新整理 Grid
                getBooGrid().dataSource.read(); 
            } else {
                alert("新增失敗：" + (response.Message || response.message));
            }
        },
        error: function(xhr) {
            console.log("Error Response:", xhr.responseText);
            alert("伺服器連線失敗");
        }
    });
}

//TODO: 已取得畫面上相關書籍資料
function updateBook(bookId) {
    var book = {
        "BookId": bookId,
        "BookName": $("#book_name_d").val().trim(),
        "BookClassId": $("#book_class_d").data("kendoDropDownList").value(),
        "BookAuthor": $("#book_author_d").val().trim(),
        "BookBoughtDate": kendo.toString($("#book_bought_date_d").data("kendoDatePicker").value(), "yyyy-MM-dd"),
        "BookPublisher": $("#book_publisher_d").val().trim(),
        "BookNote": $("#book_note_d").data("kendoEditor").value(),
        "BookStatusId": $("#book_status_d").data("kendoDropDownList").value(),
        "BookKeeperId": $("#book_keeper_d").data("kendoDropDownList").value()
    };

    $.ajax({
        type: "post",
        url: apiRootUrl + "bookmaintain/updatebook",
        data: JSON.stringify(book),
        contentType: "application/json",
        dataType: "json",
        success: function (response) {
            var isSuccess = response.Status || response.status;
            if (isSuccess) {
                alert("修改成功");
                $("#book_detail_area").data("kendoWindow").close();
                getBooGrid().dataSource.read(); // 重新整理列表
            } else {
                alert("修改失敗：" + (response.Message || response.message));
            }
        }
    });
}

//TODO!!
function deleteBook(e) {
    e.preventDefault();
    var grid = getBooGrid();
    var row = grid.dataItem($(e.currentTarget).closest("tr"));

    if (confirm("確定要刪除「" + row.bookName + "」及其所有借閱紀錄嗎？")) {
        $.ajax({
            type: "post",
            url: apiRootUrl + "bookmaintain/deletebook",
            data: JSON.stringify(row.bookId),
            contentType: "application/json",
            dataType: "json",
            success: function (response) {
                var isSuccess = response.Status || response.status;
                if (isSuccess) {
                    alert("刪除成功");
                    grid.dataSource.read(); // 重新整理列表
                } else {
                    alert(response.Message || response.message);
                }
            },
            error: function() {
                alert("伺服器連線失敗");
            }
        });
    }
}

/**
 * 顯示圖書明細-for 修改
 * @param {*} e 
 */
function showBookForUpdate(e) {
    e.preventDefault();

    state=stateOption.update;
    $("#book_detail_area").data("kendoWindow").title("修改書籍");
    //顯示存檔按鈕
    $("#btn-save").css("display","");

    //取得點選該筆的 bookId
    var grid = getBooGrid();
    var bookId = grid.dataItem(e.target.closest("tr")).bookId;

    //設定畫面唯讀與否
    enableBookDetail(true);

    //綁定資料
    bindBook(bookId);
    
    //設定借閱狀態與借閱人關聯
    setStatusKeepRelation();

    //開啟 Window
    $("#book_detail_area").data("kendoWindow").open();
}

/**
 * 顯示圖書明細-for 明細(點選Grid書名超連結)
 * @param {*} e 
 */
function showBookForDetail(e, bookId) {
    e.preventDefault();

    state = stateOption.update; 
    $("#book_detail_area").data("kendoWindow").title("書籍明細");

    // 隱藏存檔按鈕
    $("#btn-save").hide();

    // 設定畫面為唯讀
    enableBookDetail(false);

    // 執行資料繫結 (傳入參數中的 bookId)
    bindBook(bookId);

    // 開啟視窗
    $("#book_detail_area").data("kendoWindow").open();
}

/**
 * 設定書籍明細畫面唯讀與否
 * @param {*} enable 
 */
function enableBookDetail(enable) { 
    // 文字框部分
    $("#book_id_d").prop('readonly', !enable);
    $("#book_name_d").prop('readonly', !enable);
    $("#book_author_d").prop('readonly', !enable);
    $("#book_publisher_d").prop('readonly', !enable);
    
    // 對 Kendo Editor 進行控制
    var editor = $("#book_note_d").data("kendoEditor");
    if (editor) {
        // 控制 Editor 內部的 body 屬性來達成唯讀
        $(editor.body).attr("contenteditable", enable);
        
        // 微調背景顏色
        if (enable) {
            $(editor.body).css("background-color", "white");
        } else {
            $(editor.body).css("background-color", "#f5f5f5");
        }
    }

    if(enable){    
        // 啟用下拉選單與日期選擇器
        $("#book_class_d").data("kendoDropDownList").enable(true);
        $("#book_status_d").data("kendoDropDownList").enable(true);
        $("#book_bought_date_d").data("kendoDatePicker").enable(true);
    } else {
        // 禁用下拉選單與日期選擇器
        $("#book_class_d").data("kendoDropDownList").readonly();
        $("#book_status_d").data("kendoDropDownList").readonly();
        $("#book_keeper_d").data("kendoDropDownList").readonly(); 
        $("#book_bought_date_d").data("kendoDatePicker").readonly();
    }
}

 /**
  * 繫結書及明細畫面資料
  * @param {*} bookId 
  */
//TODO: 已補齊要綁的資料
function bindBook(bookId) {
    $.ajax({
        type: "post",
        url: apiRootUrl + "bookmaintain/loadbook",
        data: JSON.stringify(bookId),
        contentType: "application/json",
        dataType: "json",
        success: function (response) {
            // 同時判斷大小寫以確保相容性
            var isSuccess = response.Status || response.status;
            var book = response.Data || response.data;

            if (isSuccess && book) {
                // 文字框綁定 (優先嘗試小寫屬性)
                $("#book_id_d").val(book.bookId || book.BookId);
                $("#book_name_d").val(book.bookName || book.BookName);
                $("#book_author_d").val(book.bookAuthor || book.BookAuthor);
                $("#book_publisher_d").val(book.bookPublisher || book.BookPublisher);

                // 下拉選單與日期
                $("#book_class_d").data("kendoDropDownList").value(book.bookClassId || book.BookClassId);
                $("#book_status_d").data("kendoDropDownList").value(book.bookStatusId || book.BookStatusId);
                $("#book_bought_date_d").data("kendoDatePicker").value(book.bookBoughtDate || book.BookBoughtDate);
                
                // 借閱人的繫結
                if ($("#book_keeper_d").data("kendoDropDownList")) {
                    $("#book_keeper_d").data("kendoDropDownList").value(book.bookKeeperId || book.BookKeeperId);
                }

                // 將日期字串轉換為 Date 物件再填入
                var rawDate = book.bookBoughtDate || book.BookBoughtDate;
                if (rawDate) {
                    $("#book_bought_date_d").data("kendoDatePicker").value(new Date(rawDate));
                }

                var editor = $("#book_note_d").data("kendoEditor");
                if (editor) {
                    editor.value(book.bookNote || book.BookNote || "");
                }

                // 更新 UI
                onClassChange();
                setStatusKeepRelation();
            }
        }
    });
}

//TODO: 已完成發 AJAX 和處理後續動作
function showBookLendRecord(e) {
    e.preventDefault();
    
    var grid = getBooGrid();
    var row = grid.dataItem($(e.currentTarget).closest("tr"));
    var bookId = row.bookId;
    var bookName = row.bookName;

    $.ajax({
        type: "post",
        url: apiRootUrl + "bookmaintain/getbooklendrecord",
        data: JSON.stringify(bookId),
        contentType: "application/json",
        dataType: "json",
        success: function (response) {
            // 解決大小寫問題
            var isSuccess = (response.Status !== undefined) ? response.Status : response.status;
            var data = response.Data || response.data;
            var message = response.Message || response.message || "發生未知錯誤";

            if (isSuccess) {
                var recordGrid = $("#book_record_grid").data("kendoGrid");
                recordGrid.dataSource.data(data);
                
                var window = $("#book_record_area").data("kendoWindow");
                window.title("借閱紀錄：" + bookName);
                window.open();
            } else {
                alert("取得紀錄失敗：" + message);
            }
        },
        error: function() {
            alert("網路請求失敗，請檢查 API 連線");
        }
    });    
}

//TODO:已補齊要清空的欄位
function clear(area) {
    switch (area) {
        case "q":
            // 清空文字框
            $("#book_name_q").val("");

            // 重置所有下拉選單
            if ($("#book_class_q").data("kendoDropDownList")) {
                $("#book_class_q").data("kendoDropDownList").value("");
                $("#book_class_q").data("kendoDropDownList").select(0);
            }
            if ($("#book_keeper_q").data("kendoDropDownList")) {
                $("#book_keeper_q").data("kendoDropDownList").value("");
                $("#book_keeper_q").data("kendoDropDownList").select(0);
            }
            if ($("#book_status_q").data("kendoDropDownList")) {
                $("#book_status_q").data("kendoDropDownList").value("");
                $("#book_status_q").data("kendoDropDownList").select(0);
            }
            break;

        case "d":
            // 清空文字框
            $("#book_name_d, #book_author_d, #book_publisher_d, #book_note_d, #book_id_d").val("");
            
            // 清空 Editor
            var editor = $("#book_note_d").data("kendoEditor");
            if (editor) {
                editor.value(""); 
            }

            // 重置下拉選單到第一項 (請選擇)
            if ($("#book_class_d").data("kendoDropDownList")) {
                $("#book_class_d").data("kendoDropDownList").select(0);
            }
            if ($("#book_status_d").data("kendoDropDownList")) {
                $("#book_status_d").data("kendoDropDownList").select(0);
            }
            if ($("#book_keeper_d").data("kendoDropDownList")) {
                $("#book_keeper_d").data("kendoDropDownList").select(0);
            }

            // 重置日期
            if ($("#book_bought_date_d").data("kendoDatePicker")) {
                $("#book_bought_date_d").data("kendoDatePicker").value(new Date());
            }

            onClassChange(); // 更新圖片
            // 重置驗證狀態
            $("#book_detail_area").kendoValidator().data("kendoValidator").reset();
            break;
    }
}

// TODO: 已確認選項關聯呈現方式                      
function setStatusKeepRelation() { 
    var keeperDropDownList = $("#book_keeper_d").data("kendoDropDownList");
    if (!keeperDropDownList) return;

    // 檢查目前是否為明細(唯讀)模式
    var isReadOnlyMode = ($("#btn-save").css("display") === "none");

    switch (state) {
        case "add":
            $("#book_status_d_col").css("display","none");
            $("#book_keeper_d_col").css("display","none");
            $("#book_status_d").prop('required',false);
            $("#book_keeper_d").prop('required',false);            
            break;
            
        case "update":
            $("#book_status_d_col").css("display","");
            $("#book_keeper_d_col").css("display","");
            $("#book_status_d").prop('required',true);

            var bookStatusId = $("#book_status_d").data("kendoDropDownList").value();

            if(bookStatusId == "A" || bookStatusId == "U") {
                $("#book_keeper_d").prop('required', false);
                $("#book_keeper_d_label").removeClass("required");
                keeperDropDownList.value(""); 
                keeperDropDownList.enable(false); 
                $("#book_detail_area").data("kendoValidator").validateInput($("#book_keeper_d"));
            } else {
                $("#book_keeper_d").prop('required', true);
                $("#book_keeper_d_label").addClass("required");

                // 只有在非唯讀模式下，才允許啟用下拉選單
                if (!isReadOnlyMode) {
                    keeperDropDownList.enable(true);
                } else {
                    keeperDropDownList.readonly(); // 確保維持唯讀
                }
            }
            break;
    }
}

 /**
  * 生成畫面上的 Kendo 控制項
  */
//TODO!!
function registerRegularComponent(){
    
    $("#book_status_q").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        optionLabel: "請選擇",
        index: 0,        
        dataSource: {
            schema:{
                data:"data"
            },
            transport: {
                read: {
                    dataType: "json",
                    type:"post",
                    url: apiRootUrl+"code/bookstatus",
                }
            }
        }
    });

    $("#book_status_d").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        optionLabel: "請選擇",
        index: 0,        
        dataSource: {
            schema:{
                data:"data"
            },
            transport: {
                read: {
                    dataType: "json",
                    type:"post",
                    url: apiRootUrl+"code/bookstatus",
                }
            }
        },
        change: function(e) {
            setStatusKeepRelation(); // 狀態改變時，自動切換借閱人是否必填
        }
    });

    //TODO: 已完成其他的下拉選單

    $("#book_class_q").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        optionLabel: "請選擇",
        index: 0, // 保持預設選取「請選擇」
        dataSource: {
            transport: {
                read: {
                    url: apiRootUrl + "code/bookclass",
                    type: "post",
                    dataType: "json"
                }
            },
            schema: { data: "data" }
        }
    });

    $("#book_class_d").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        optionLabel: "請選擇",
        index: 0, // 保持預設選取「請選擇」
        dataSource: {
            transport: {
                read: {
                    url: apiRootUrl + "code/bookclass",
                    type: "post",
                    dataType: "json"
                }
            },
            schema: { data: "data" }
        },
        change: function(e) {
            onClassChange();
        }
    });

    // 借閱人下拉選單
    $("#book_keeper_q, #book_keeper_d").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        optionLabel: "請選擇",
        index: 0, // 保持預設選取請選擇
        dataSource: {
            transport: {
                read: {
                    url: apiRootUrl + "code/user", // 假設 API 路徑
                    type: "post",
                    dataType: "json"
                }
            },
            schema: { data: "data" }
        }
    });

    $("#book_bought_date_d").kendoDatePicker({
        format: "yyyy-MM-dd",
        value: new Date(),
        dateInput: true
    });

    $("#book_note_d").kendoEditor({
        tools: [
            "bold", "italic", "underline", "insertUnorderedList", "insertOrderedList"
        ]
    });
}

/**
 * 
 * @returns 取得畫面上的 book grid
 */
function getBooGrid(){
    return $("#book_grid").data("kendoGrid");
}