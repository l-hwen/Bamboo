var express = require('express');
var Q=require('q');
var bodyParser = require("body-parser");
var favicon = require('express-favicon');
var path = require('path');
const os = require('os');
var db = require('./msdb.js');
var sms = require('./sms.js');
var defer=Q.defer();
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
var sql="";
app.use(express.static('client'));
app.use(favicon(path.resolve(__dirname, '..') +'/client/images/favicon.ico'));
app.use(function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    if(req.path.indexOf('/api')>=0){
        var ServerType = req.path.match(/api[/](\S*)/)[1];
        if(ServerType=="query"){
            if(req.method=="GET"){
                var data={Status:""};
                if(req.query.ServerName=='login'){
                    sql="select * from T_EmployeeInfo where EmployeeCode ='"+req.query.username+"' and EmployeePassword='"+req.query.password+"'";
                }
                if(req.query.ServerName=='Register'){
                    sql="select * from T_EmployeeInfo where EmployeeCode ='"+req.query.EmployeeCode+"'";
                }
                if(req.query.ServerName=='getEmployeeInfoList'){
                    if(req.query.filter){
                        sql=" select *,(select count(1) from T_EmployeeInfo where (EmployeeCode like '%"+req.query.filter+"%' or EmployeeName like '%"+req.query.filter+"%' or Phone like '%"+req.query.filter+"%')) as SumTotal from T_EmployeeInfo where T_EmployeeInfo.EmployeeID in(" +
                            "select top 50 EmployeeID FROM(select top (50*'"+req.query.currentPage+"') EmployeeID from T_EmployeeInfo where (EmployeeCode like '%"+req.query.filter+"%' or EmployeeName like '%"+req.query.filter+"%' or Phone like '%"+req.query.filter+"%') order by T_EmployeeInfo.EmployeeID asc)TT " +
                            "order by TT.EmployeeID desc) order by EmployeeID";
                    }else{
                        sql=" select *,(select count(1) from T_EmployeeInfo) as SumTotal from T_EmployeeInfo where T_EmployeeInfo.EmployeeID in(" +
                            "select top 50 EmployeeID FROM(select top (50*'"+req.query.currentPage+"') EmployeeID from T_EmployeeInfo order by T_EmployeeInfo.EmployeeID asc)TT " +
                            "order by TT.EmployeeID desc) order by EmployeeID";
                    }
                }
                if(req.query.ServerName=='getCustomerInfoList'){
                    if(req.query.IsAdmin=="1"){
                        if(req.query.filter){
                            sql=" select *,(select count(1) from T_CustomerInfo) as SumTotal from T_CustomerInfo where ((CustomerName like '%"+req.query.filter+"%' or CardID like '%"+req.query.filter+"%' or Phone like '%"+req.query.filter+"%')) AND T_CustomerInfo.CustomerID in(" +
                                "select top 50 CustomerID FROM(select top (50*'"+req.query.currentPage+"') CustomerID from T_CustomerInfo order by T_CustomerInfo.CustomerID asc)TT " +
                                "order by TT.CustomerID desc) order by CustomerID desc";
                        }
                        else{
                            sql=" select *,(select count(1) from T_CustomerInfo) as SumTotal from T_CustomerInfo where T_CustomerInfo.CustomerID in(" +
                                "select top 50 CustomerID FROM(select top (50*'"+req.query.currentPage+"') CustomerID from T_CustomerInfo order by T_CustomerInfo.CustomerID asc)TT " +
                                "order by TT.CustomerID desc) order by CustomerID desc";
                        }
                    }
                    if(req.query.IsAdmin=="2"){
                        if(req.query.filter){
                            sql=" select *,(select count(1) from T_CustomerInfo) as SumTotal from T_CustomerInfo where ((BusinessManID='"+req.query.EmployeeID+"') and (CustomerName like '%"+req.query.filter+"%' or CardID like '%"+req.query.filter+"%' or Phone like '%"+req.query.filter+"%')) AND T_CustomerInfo.CustomerID in(" +
                                "select top 50 CustomerID FROM(select top (50*'"+req.query.currentPage+"') CustomerID from T_CustomerInfo order by T_CustomerInfo.CustomerID asc)TT " +
                                "order by TT.CustomerID desc) order by CustomerID desc";
                        }
                        else{
                            sql=" select *,(select count(1) from T_CustomerInfo) as SumTotal from T_CustomerInfo where (BusinessManID='"+req.query.EmployeeID+"') AND T_CustomerInfo.CustomerID in(" +
                                "select top 50 CustomerID FROM(select top (50*'"+req.query.currentPage+"') CustomerID from T_CustomerInfo order by T_CustomerInfo.CustomerID asc)TT " +
                                "order by TT.CustomerID desc) order by CustomerID desc";
                        }
                    }
                }
                if(req.query.ServerName=='queryCardIDIsApplied'){
                    // sql="select * from T_CustomerInfo ";

                    var customerInfo = JSON.parse(req.query.CustomerInfo);
                    var cardID = customerInfo.customerCardID;
                    if(req.query.Type == 1){
                        //sql="select * from T_CustomerInfo where CardID = '"+cardID+"' and ApplyType='贷款'";
                        sql="select T1.*,T2.LimitRange AS LimitRange  from  T_CustomerInfo T1 left join T_TestPaperInfo T2 on T1.TestID=T2.TestID  where T1.CardID = '"+cardID+"' and T1.ApplyType='贷款'";
                    }else if(req.query.Type == 2){
                        sql="select T1.*,T2.LimitRange AS LimitRange  from  T_CustomerInfo T1 left join T_TestPaperInfo T2 on T1.TestID=T2.TestID  where T1.CardID = '"+cardID+"' and T1.ApplyType='信用卡'";
                    }else if(req.query.Type == 3){
                        sql="select * from T_CustomerInfo where CardID = '"+cardID+"'";
                    }
                }
                if(req.query.ServerName=='addCardIDInfo'){
                    var customerInfo = JSON.parse(req.query.CustomerInfo);
                    var customerName = customerInfo.customerName;
                    var customerPhone = customerInfo.customerPhone;
                    var customerAge = customerInfo.customerAge;
                    var customerSex = customerInfo.customerSex;
                    var cardID = customerInfo.customerCardID;
                    if(req.query.Type == 2){
                        sql="INSERT INTO T_CustomerInfo ([CustomerName],[Phone],[CardID],[Age],[Sex],[BusinessMan],[BusinessManID],[CreateDate],[ApplyType],[SendSMS1]) "+
                            "VALUES ('"+customerName +"', '"+customerPhone +"','"+ cardID +"','"+ customerAge +"','" + customerSex +"','"+ req.query.EmployeeName+"',"+ req.query.BusinessManID +", getdate() ,'信用卡','"+ req.query.Status+"')";
                    }else if(req.query.Type == 1){
                        sql="INSERT INTO T_CustomerInfo ([CustomerName],[Phone],[CardID],[Age],[Sex],[BusinessMan],[BusinessManID],[CreateDate],[ApplyType],[SendSMS1]) "+
                            "VALUES ('"+customerName +"', '"+customerPhone +"','"+ cardID +"','"+ customerAge +"','" + customerSex +"','"+ req.query.EmployeeName+"',"+ req.query.BusinessManID +", getdate() ,'贷款', '"+ req.query.Status+"')";
                    }
                }
                if(req.query.ServerName=='updateCardIDInfo'){
                    var customerInfo = JSON.parse(req.query.CustomerInfo);
                    if(req.query.Type == 2){
                        sql="update T_CustomerInfo "+
                            "set IsApplication = 1,ApplyDate = getdate(), CustomerName = '"+customerInfo.CustomerName +"',Phone='"+ customerInfo.Phone+"', TestID=" + req.query.PaperID+
                            " where CustomerID = "+ customerInfo.CustomerID+" and CardID = '"+ customerInfo.CardID+"' and ApplyType ='信用卡'";
                    }else if(req.query.Type == 1){
                        sql="update T_CustomerInfo "+
                            "set IsApplication = 1,ApplyDate = getdate(), CustomerName = '"+customerInfo.CustomerName +"',Phone='"+ customerInfo.Phone+"', TestID=" + req.query.PaperID+
                            " where CustomerID = "+ customerInfo.CustomerID+" and CardID = '"+ customerInfo.CardID+"' and ApplyType ='贷款'";
                    }
                }
                if(req.query.ServerName=='updateSMS'){
                    var customerInfo = JSON.parse(req.query.CustomerInfo);
                    if(req.query.Type == 2){
                        sql="update T_CustomerInfo "+
                            "set SendSMS2 = 'OK'"+
                            " where  CardID = '"+ customerInfo.customerCardID+"' and ApplyType ='信用卡'";
                    }else if(req.query.Type == 1){
                        sql="update T_CustomerInfo "+
                            "set SendSMS2 = 'OK'"+
                            " where  CardID = '"+ customerInfo.customerCardID+"' and ApplyType ='贷款'";
                    }
                }
                if(req.query.ServerName=='addTestPaper'){
                    var TestPaper = JSON.parse(req.query.TestPaper);
                    if(req.query.Type == 2){
                        sql="INSERT INTO T_TestPaperInfo ([TestType],[TestDetail],[TotalScore],[LimitRange],[CardID])"+
                            " VALUES ('信用卡', '"+ TestPaper.Content +"',"+ TestPaper.Score +",'"+ TestPaper.LimitRange +"','"+ TestPaper.CardID +"')  select @@IDENTITY as id";
                    }else if(req.query.Type == 1){
                        sql="INSERT INTO T_TestPaperInfo ([TestType],[TestDetail],[TotalScore],[LimitRange],[CardID])"+
                            " VALUES ('贷款', '"+ TestPaper.Content +"',"+ TestPaper.Score +",'"+ TestPaper.LimitRange +"','"+ TestPaper.CardID +"')   select @@IDENTITY as id";
                    }
                }
                console.log(sql);
                db.querySql(sql, null, function(err, result){
                    if(result){
                        data.Status="OK";
                        data.Result=result.recordsets[0];
                        res.send(JSON.stringify(data));
                    }
                    else{
                        console.log(err);
                        data.Status="Error";
                        data.ErrorMessage=err.message;
                        res.send(JSON.stringify(data));
                    }
                });
            }
            if(req.method=="POST"){
                var data={Status:""};
                if(req.query.ServerName=='AddEmployee'){
                    sql="INSERT INTO T_EmployeeInfo (EmployeeCode,EmployeeName,IsAdmin,EmployeePassword,Phone,Position,Manager,State) VALUES " +
                        "('"+req.body.EmployeeCode+"', '"+req.body.EmployeeName+"','"+req.body.IsAdmin+"','"+req.body.EmployeePassword+"','"+req.body.Phone+"','"+req.body.Position+"','','1')";
                }
                if(req.query.ServerName=='EditEmployee'){
                    if(req.body.EmployeeCode){
                        sql="UPDATE T_EmployeeInfo SET EmployeeCode='"+req.body.EmployeeCode+"', EmployeeName='"+req.body.EmployeeName+"',IsAdmin='"+req.body.IsAdmin+"',EmployeePassword='"+req.body.EmployeePassword+"'," +
                            "Phone='"+req.body.Phone+"',Position='"+req.body.Position+"' WHERE  EmployeeID='"+req.body.EmployeeID+"'";
                    }
                    else{
                        sql="UPDATE T_EmployeeInfo SET EmployeeName='"+req.body.EmployeeName+"',IsAdmin='"+req.body.IsAdmin+"',EmployeePassword='"+req.body.EmployeePassword+"'," +
                            "Phone='"+req.body.Phone+"',Position='"+req.body.Position+"' WHERE  EmployeeID='"+req.body.EmployeeID+"'";
                    }
                }
                if(req.query.ServerName=='ChangePassword'){
                    sql="UPDATE T_EmployeeInfo SET EmployeePassword='"+req.body.EmployeePassword+"' WHERE  EmployeeID='"+req.body.EmployeeID+"'";
                }
                if(req.query.ServerName=='addCardIDInfo'){
                    var customerName = req.body.customerName;
                    var customerPhone = req.body.customerPhone;
                    var customerAge = req.body.customerAge;
                    var customerSex = req.body.customerSex;
                    var cardID = req.body.customerCardID;
                    if(req.body.Type == 2){
                        sql="INSERT INTO T_CustomerInfo ([CustomerName],[Phone],[CardID],[Age],[Sex],[BusinessMan],[BusinessManID],[CreateDate],[ApplyType],[SendSMS1]) "+
                            "VALUES ('"+customerName +"', '"+customerPhone +"','"+ cardID +"','"+ customerAge +"','" + customerSex +"','"+ req.body.EmployeeName+"',"+ req.body.BusinessManID +", getdate() ,'信用卡','"+ req.body.Status+"')";
                    }else if(req.body.Type == 1){
                        sql="INSERT INTO T_CustomerInfo ([CustomerName],[Phone],[CardID],[Age],[Sex],[BusinessMan],[BusinessManID],[CreateDate],[ApplyType],[SendSMS1]) "+
                            "VALUES ('"+customerName +"', '"+customerPhone +"','"+ cardID +"','"+ customerAge +"','" + customerSex +"','"+ req.body.EmployeeName+"',"+ req.body.BusinessManID +", getdate() ,'贷款', '"+ req.body.Status+"')";
                    }
                }
                if(req.query.ServerName=='updateCardIDInfo'){
                    if(req.body.Type == 2){
                        sql="update T_CustomerInfo "+
                            "set IsApplication = 1,ApplyDate = getdate(), CustomerName = '"+req.body.CustomerName +"',Phone='"+ req.body.Phone+"', TestID=" + req.body.PaperID+
                            " where CustomerID = "+ req.body.CustomerID+" and CardID = '"+ req.body.CardID+"' and ApplyType ='信用卡'";
                    }else if(req.body.Type == 1){
                        sql="update T_CustomerInfo "+
                            "set IsApplication = 1,ApplyDate = getdate(), CustomerName = '"+req.body.CustomerName +"',Phone='"+ req.body.Phone+"', TestID=" + req.body.PaperID+
                            " where CustomerID = "+ req.body.CustomerID+" and CardID = '"+ req.body.CardID+"' and ApplyType ='贷款'";
                    }
                }
                if(req.query.ServerName=='updateSMS'){
                    var customerInfo = JSON.parse(req.query.CustomerInfo);
                    if(req.query.Type == 2){
                        sql="update T_CustomerInfo "+
                            "set SendSMS2 = 'OK'"+
                            " where  CardID = '"+ customerInfo.customerCardID+"' and ApplyType ='信用卡'";
                    }else if(req.query.Type == 1){
                        sql="update T_CustomerInfo "+
                            "set SendSMS2 = 'OK'"+
                            " where  CardID = '"+ customerInfo.customerCardID+"' and ApplyType ='贷款'";
                    }
                }
                if(req.query.ServerName=='addTestPaper'){
                    if(req.body.Type == 2){
                        sql="INSERT INTO T_TestPaperInfo ([TestType],[TestDetail],[TotalScore],[LimitRange],[CardID])"+
                            " VALUES ('信用卡', '"+ req.body.Content +"',"+ req.body.Score +",'"+ req.body.LimitRange +"','"+ req.body.CardID +"')  select @@IDENTITY as id";
                    }else if(req.body.Type == 1){
                        sql="INSERT INTO T_TestPaperInfo ([TestType],[TestDetail],[TotalScore],[LimitRange],[CardID])"+
                            " VALUES ('贷款', '"+ req.body.Content +"',"+ req.body.Score +",'"+ req.body.LimitRange +"','"+ req.body.CardID +"')   select @@IDENTITY as id";
                    }
                }
                console.log(sql);
                db.querySql(sql, null, function(err, result){
                    if(result){
                        data.Status="OK";
                        data.Result=result.recordsets[0];
                        res.send(JSON.stringify(data));
                    }
                    else{
                        console.log(err);
                        data.Status="Error";
                        data.ErrorMessage=err.message;
                        res.send(JSON.stringify(data));
                    }
                });
            }
        }
        if(ServerType=='sms'){//短信服务
            var data={Status:""};
            var customerInfo = JSON.parse(req.query.CustomerInfo);
            var smsItem = {
                phoneNum: customerInfo.customerPhone,
                type: req.query.Type,
                customerName: customerInfo.customerName
            };
            sms(smsItem).then(
                function(result){
                    data.Status="OK";
                    data.Result=result;
                    res.send(JSON.stringify(data));
                },function(err){
                    data.Status="Error";
                    data.ErrorMessage=err;
                    res.send(JSON.stringify(data));
                }
            );
        }
    }
    else{
        res.sendFile(path.resolve(__dirname, '..') +'/client/index.html');
    }
});


var iptable={},
    hosts,
ifaces=os.networkInterfaces();
for (var dev in ifaces) {
    ifaces[dev].forEach(function(details,alias){
        if (details.family=='IPv4') {
            iptable[dev+(alias?':'+alias:'')]=details.address;
            if(!details.internal){
                hosts=details.address;
            }
        }
    });
}
console.log(iptable);
var server = app.listen(8090, function () {

    var host = server.address().address;
    host=hosts;
    var port = server.address().port;


    console.log("应用实例，访问地址为 http://%s:%s", host, port)

})