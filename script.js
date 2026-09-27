const REGIONS=['Bắc','Trung','Nam'];
const TYPES=['Biển','Núi','Thiên nhiên','Thành phố','Văn hóa','Ẩm thực','Nghỉ dưỡng','Road trip','Cắm trại'];
const ICON={Biển:'🌊',Núi:'⛰️','Thiên nhiên':'🌿','Thành phố':'🏙️','Văn hóa':'🏮','Ẩm thực':'🍜','Nghỉ dưỡng':'🏝️','Road trip':'🚗','Cắm trại':'⛺'};
const GRAD={Biển:['#0E6BA8','#39B7E8'],Núi:['#3A5A7A','#8FAFC8'],'Thiên nhiên':['#1E6B4A','#6BBF8C'],'Thành phố':['#2B3A55','#5E7BA8'],'Văn hóa':['#8A3B22','#E08A4C'],'Ẩm thực':['#A13E2E','#E9924F'],'Nghỉ dưỡng':['#0D7C7C','#4FC3C3'],'Road trip':['#5A3E8A','#9C7FD1'],'Cắm trại':['#2E5B3E','#79A66B']};

// 💡 THAY ẢNH THẬT: mỗi bài viết dưới đây đang dùng nền gradient + icon làm ảnh tạm.
// Muốn dùng ảnh thật, chỉ cần thêm thuộc tính img vào bài viết đó, ví dụ:
//   { title:"...", loc:"...", img:"https://duong-dan-anh-that.jpg", ... }
// Hệ thống sẽ tự động hiển thị ảnh thật thay cho nền màu, không cần sửa gì khác.
const A=[
{title:"Kinh nghiệm du lịch Đà Nẵng 3 ngày 2 đêm tự túc chi tiết từ A-Z",loc:"Đà Nẵng & Hội An",region:"Trung",types:["Biển","Thành phố"],cat:"Lịch trình",author:"Vũ Minh Khang",read:6,rating:4.9,rev:230,excerpt:"Bí kíp vi vu Đà Nẵng trọn vẹn: thời điểm lý tưởng, phương tiện đi lại, khách sạn view biển và lịch trình kết hợp tham quan phố cổ Hội An tối ưu chi phí.",content:["Đà Nẵng buổi sáng bắt đầu bằng ly cà phê nhìn ra cầu Rồng, còn buổi tối là những con phố Hội An sáng đèn lồng. Ba ngày hai đêm là đủ để nếm trọn cả biển lẫn phố cổ nếu biết sắp xếp.","Ngày đầu dành cho Bà Nà Hills và Cầu Vàng, ngày hai lượn biển Mỹ Khê rồi chạy xe máy sang Hội An, ngày cuối la cà chợ Cồn mua đặc sản trước khi ra sân bay.","Chi phí trung bình cho một người dao động 2-3 triệu đồng nếu ở homestay và ăn uống bình dân, có thể tăng gấp đôi nếu chọn resort ven biển."],featured:true,tour:"da-nang"},
{title:"Trải nghiệm du thuyền 5 sao trên Vịnh Hạ Long: 2 ngày 1 đêm giữa kỳ quan",loc:"Vịnh Hạ Long, Quảng Ninh",region:"Bắc",types:["Biển","Thiên nhiên"],cat:"Trải nghiệm người thật",author:"Nguyễn Bích Phượng",read:5,rating:4.9,rev:230,excerpt:"Khám phá trọn vẹn vẻ đẹp kỳ quan thiên nhiên thế giới qua hành trình 2 ngày 1 đêm trên du thuyền, từ hang Sửng Sốt đến buổi tối chèo kayak dưới ánh trăng.",content:["Con thuyền rời cảng lúc trưa, để lại sau lưng tiếng còi tàu và mở ra trước mặt hàng nghìn hòn đảo đá vôi nhấp nhô trên mặt nước xanh ngọc.","Buổi chiều là hang Sửng Sốt với những nhũ đá kỳ vĩ, buổi tối bữa tối hải sản trên boong và một vòng chèo kayak yên tĩnh giữa vịnh khi trăng lên.","Sáng hôm sau, lớp học nấu ăn ngắn và bài tập thái cực quyền trên boong tàu khép lại chuyến đi trước khi thuyền cập bến."],featured:true,tour:"ha-long"},
{title:"Trọn bộ bí kíp trekking Sa Pa và chinh phục nóc nhà Đông Dương",loc:"Sa Pa, Lào Cai",region:"Bắc",types:["Núi","Thiên nhiên"],cat:"Mẹo du lịch",author:"Đặng Tuấn Nghĩa",read:6,rating:4.8,rev:112,excerpt:"Tất tần tật kinh nghiệm chuẩn bị thể lực, trang phục và đồ dùng chuyên dụng khi trekking cung đường Fansipan cho người mới bắt đầu.",content:["Fansipan không đòi hỏi kỹ năng leo núi chuyên nghiệp nhưng vẫn cần một nền thể lực tốt và giày trekking bám đường chắc chắn.","Cung đường phổ biến nhất mất khoảng hai ngày một đêm, ngủ lại ở trạm dừng chân giữa rừng trúc trước khi chinh phục đỉnh vào sáng sớm hôm sau.","Tháng 9 đến tháng 11 là thời điểm trời quang mây tạnh nhất, thích hợp để ngắm biển mây từ đỉnh núi cao nhất Đông Dương."]},
{title:"Dạo bước phố cổ Hội An: thả đèn hoa đăng và thưởng thức ẩm thực",loc:"Hội An, Quảng Nam",region:"Trung",types:["Văn hóa","Ẩm thực"],cat:"Điểm đến",author:"Mai Thanh Tâm",read:4,rating:5.0,rev:188,excerpt:"Hành trình tìm về vẻ đẹp hoài niệm của di sản Hội An: dạo bước dưới ánh lồng đèn rực rỡ, lắng nghe câu chuyện phố cổ qua từng mái ngói rêu phong.",content:["Khi hoàng hôn buông xuống, phố cổ Hội An bừng sáng bởi hàng trăm chiếc đèn lồng treo dọc bờ sông Hoài, phản chiếu lung linh trên mặt nước.","Một chiếc thuyền nhỏ chở khách thả đèn hoa đăng, mỗi ngọn nến nhỏ mang theo một điều ước thả trôi theo dòng sông giữa tiếng nhạc cổ vẳng lại từ quán trà.","Kết thúc buổi tối bằng đĩa cao lầu nóng hổi và ly chè bắp bên vỉa hè, hương vị mộc mạc mà khó quên của phố Hội."]},
{title:"Cẩm nang chinh phục cao nguyên đá Hà Giang bằng xe máy",loc:"Hà Giang",region:"Bắc",types:["Road trip","Núi"],cat:"Road trip",author:"Lê Hoàng Nam",read:7,rating:4.9,rev:301,excerpt:"Cung đường Hà Giang huyền thoại qua đèo Mã Pí Lèng, cột cờ Lũng Cú và những bản làng người Mông ẩn mình giữa cao nguyên đá tai mèo.",content:["Đèo Mã Pí Lèng uốn lượn bên vực sâu sông Nho Quế là khoảnh khắc khiến bất kỳ tay lái nào cũng phải dừng xe để hít thở và chụp lại khung cảnh.","Cột cờ Lũng Cú đứng sừng sững ở điểm cực Bắc, nơi có thể nhìn thấy toàn cảnh cao nguyên đá trải dài đến tận chân trời.","Bốn ngày ba đêm với xe máy là đủ để đi trọn cung đường, nghỉ đêm tại các homestay bản Mông và thưởng thức thắng cố, rượu ngô ấm nồng."],tour:"ha-giang",featured:true},
{title:"Ninh Bình mùa lúa chín: chèo thuyền Tam Cốc ngắm cánh đồng vàng",loc:"Ninh Bình",region:"Bắc",types:["Thiên nhiên","Văn hóa"],cat:"Hành trình 48 giờ",author:"Phạm Thu Hà",read:5,rating:4.7,rev:96,excerpt:"Hai ngày một đêm khám phá Tràng An, Tam Cốc và hang Múa vào đúng mùa lúa chín, khi cánh đồng khoác lên sắc vàng rực rỡ.",content:["Ngồi trên chiếc thuyền nan nhỏ, người lái đò chèo bằng chân lướt qua những hang đá xuyên núi, hai bên là cánh đồng lúa chín vàng óng ả.","Leo hơn năm trăm bậc thang lên hang Múa vào lúc chiều tà, cả vùng Tam Cốc hiện ra như một bức tranh thủy mặc dưới ánh nắng cuối ngày.","Ninh Bình đẹp nhất vào khoảng đầu tháng 6, khi lúa vừa ngả vàng nhưng chưa đến vụ gặt."]},
{title:"Mộc Châu mùa hoa mận trắng: chuyến đi cuối tuần đáng nhớ",loc:"Mộc Châu, Sơn La",region:"Bắc",types:["Thiên nhiên","Cắm trại"],cat:"Hành trình 48 giờ",author:"Đinh Gia Bảo",read:4,rating:4.6,rev:74,excerpt:"Cao nguyên Mộc Châu bừng sáng sắc trắng hoa mận vào cuối đông, lý tưởng cho chuyến cắm trại ngắn ngày giữa những đồi chè xanh mướt.",content:["Từng thung lũng hoa mận trắng muốt trải dài dưới chân núi, xen giữa là những nếp nhà sàn của bản người Thái ẩn hiện trong sương sớm.","Buổi tối dựng trại giữa đồi chè, nhóm lửa nướng khoai và ngắm trọn bầu trời đầy sao mà khó tìm thấy ở thành phố.","Cuối tháng 12 đến đầu tháng 1 là thời điểm hoa mận nở rộ đẹp nhất trong năm."]},
{title:"Cát Bà - hòn đảo hoang sơ giữa vịnh Lan Hạ",loc:"Cát Bà, Hải Phòng",region:"Bắc",types:["Biển","Thiên nhiên"],cat:"Điểm đến",author:"Ngô Thảo Vy",read:5,rating:4.7,rev:120,excerpt:"Vịnh Lan Hạ ít người biết đến hơn Hạ Long nhưng không kém phần kỳ vĩ, với những bãi cát trắng mịn và làn nước xanh trong vắt.",content:["Khác với sự nhộn nhịp của Hạ Long, Lan Hạ giữ được vẻ hoang sơ với các bãi tắm nhỏ chỉ có vài chiếc thuyền neo đậu.","Chèo kayak len lỏi qua các hang động đá vôi, đôi khi bắt gặp đàn khỉ vàng chuyền cành trên vách núi ven vịnh.","Cát Bà còn có vườn quốc gia với đường trekking xuyên rừng nguyên sinh, phù hợp cho ai muốn kết hợp cả biển và núi trong một chuyến đi."]},
{title:"48 giờ ở Huế: lăng tẩm, sông Hương và ẩm thực cung đình",loc:"Huế",region:"Trung",types:["Văn hóa","Ẩm thực"],cat:"Hành trình 48 giờ",author:"Trần Bảo Ngọc",read:6,rating:4.8,rev:143,excerpt:"Khám phá cố đô Huế trong hai ngày: dạo thuyền rồng trên sông Hương, viếng lăng Khải Định uy nghiêm và nếm thử loạt món ăn cung đình tinh tế.",content:["Thuyền rồng lững lờ trôi trên sông Hương lúc hoàng hôn, tiếng ca Huế vang lên nhẹ nhàng giữa không gian tĩnh lặng của cố đô.","Lăng Khải Định gây ấn tượng với lối kiến trúc pha trộn Đông Tây độc đáo, từng chi tiết chạm khắc đều mang dấu ấn thời gian.","Một bữa cơm cung đình với hàng chục món nhỏ tinh tế là cách khép lại chuyến đi trọn vẹn nhất."]},
{title:"Phong Nha - Kẻ Bàng: vào lòng hang động đẹp nhất thế giới",loc:"Phong Nha, Quảng Bình",region:"Trung",types:["Thiên nhiên","Cắm trại"],cat:"Trải nghiệm người thật",author:"Hồ Anh Dũng",read:7,rating:4.9,rev:210,excerpt:"Hành trình khám phá hệ thống hang động Phong Nha - Kẻ Bàng, từ động Thiên Đường lộng lẫy đến trải nghiệm ngủ đêm trong hang Tú Làn.",content:["Ánh đèn pin lướt qua những khối thạch nhũ triệu năm tuổi trong động Thiên Đường, không gian tĩnh mịch chỉ còn tiếng nước nhỏ giọt vang vọng.","Với những ai ưa mạo hiểm hơn, tour ngủ đêm trong hang Tú Làn mang đến cảm giác đặc biệt khi dựng lều ngay bên dòng suối ngầm.","Vườn quốc gia Phong Nha - Kẻ Bàng còn giữ được cánh rừng nguyên sinh rộng lớn, nơi sinh sống của nhiều loài động thực vật quý hiếm."]},
{title:"Quy Nhơn - viên ngọc biển miền Trung chưa bị thương mại hóa",loc:"Quy Nhơn, Bình Định",region:"Trung",types:["Biển","Nghỉ dưỡng"],cat:"Điểm đến",author:"Nguyễn Thảo My",read:5,rating:4.7,rev:88,excerpt:"Eo Gió, Kỳ Co và những bãi biển vắng người là lý do Quy Nhơn ngày càng được lòng dân du lịch tự túc thích sự yên tĩnh.",content:["Kỳ Co hiện ra sau khúc cua cuối cùng như một vịnh nhỏ tách biệt, nước biển trong đến mức nhìn rõ từng viên đá cuội dưới đáy.","Eo Gió vào sáng sớm gần như không một bóng người, chỉ có tiếng sóng vỗ vào vách đá và gió lồng lộng thổi qua triền núi.","Thành phố Quy Nhơn vẫn giữ được nhịp sống chậm rãi, các quán hải sản ven biển bán đúng giá và tươi ngon quanh năm."]},
{title:"Nha Trang bốn mùa biển xanh: lịch trình nghỉ dưỡng trọn gói",loc:"Nha Trang, Khánh Hòa",region:"Trung",types:["Biển","Nghỉ dưỡng"],cat:"Kinh nghiệm",author:"Vũ Minh Khang",read:5,rating:4.6,rev:167,excerpt:"Từ tắm bùn khoáng đến lặn ngắm san hô ở Hòn Mun, đây là lịch trình nghỉ dưỡng ba ngày phù hợp cho cả gia đình lẫn cặp đôi.",content:["Buổi sáng dành cho khu tắm bùn khoáng nóng, làn bùn ấm giúp thư giãn toàn thân sau chặng đường di chuyển dài.","Chiều đến, tàu đáy kính đưa khách ra Hòn Mun lặn ngắm rạn san hô nhiều màu sắc, phù hợp cả với người chưa biết bơi.","Buổi tối dạo biển Trần Phú, thưởng thức hải sản nướng và ngắm thành phố lên đèn dọc bờ vịnh."]},
{title:"Đà Lạt mù sương: 3 ngày sống chậm giữa đồi thông",loc:"Đà Lạt, Lâm Đồng",region:"Trung",types:["Thiên nhiên","Nghỉ dưỡng"],cat:"Kinh nghiệm",author:"Trịnh Yến Nhi",read:6,rating:4.8,rev:255,excerpt:"Thung lũng Tình Yêu, đồi chè Cầu Đất và những quán cà phê view rừng thông - Đà Lạt vẫn luôn là điểm đến chữa lành quen thuộc.",content:["Sương sớm còn giăng trên mặt hồ Xuân Hương khi những gánh hàng rong đầu tiên bắt đầu bán bánh căn nóng hổi.","Đồi chè Cầu Đất trải dài như tấm thảm xanh bất tận, thấp thoáng vài cây thông cô đơn đứng giữa luống chè.","Tối về, một quán cà phê nhỏ với lò sưởi củi và ly trà gừng ấm là cách kết thúc ngày hoàn hảo giữa cái lạnh cao nguyên."]},
{title:"Road trip Đà Lạt - Nha Trang qua đèo Khánh Lê một ngày",loc:"Đà Lạt - Nha Trang",region:"Trung",types:["Road trip","Núi"],cat:"Road trip",author:"Lê Hoàng Nam",read:5,rating:4.7,rev:99,excerpt:"Cung đèo Khánh Lê nối liền cao nguyên và biển chỉ trong một ngày lái xe, xuyên qua rừng thông và mây mù bảng lảng.",content:["Rời Đà Lạt lúc sáng sớm, con đường đèo dần khuất trong lớp mây dày đặc, tầm nhìn chỉ còn vài mét trước đầu xe.","Qua khỏi đỉnh đèo, không khí ấm dần lên và những rặng thông nhường chỗ cho cây nhiệt đới báo hiệu biển đã gần kề.","Chỉ khoảng 140km nhưng cung đường này cho cảm giác đi qua hai vùng khí hậu hoàn toàn khác biệt trong cùng một ngày."]},
{title:"Phú Quốc nghỉ dưỡng trọn gói: resort, lặn biển và chợ đêm",loc:"Phú Quốc, Kiên Giang",region:"Nam",types:["Biển","Nghỉ dưỡng"],cat:"Kinh nghiệm",author:"Bùi Ngọc Anh",read:6,rating:4.8,rev:198,excerpt:"Đảo ngọc Phú Quốc với cáp treo vượt biển dài nhất thế giới, những rạn san hô còn nguyên sơ và chợ đêm hải sản tấp nập.",content:["Cáp treo Hòn Thơm lướt qua mặt biển xanh ngọc, phía dưới thấp thoáng những chiếc thuyền câu nhỏ neo đậu rải rác.","Buổi chiều dành cho tour lặn ngắm san hô ở khu bảo tồn biển, nước trong đến mức có thể nhìn thấy cá bơi ngay dưới thuyền.","Chợ đêm Dinh Cậu về tối rực ánh đèn, mùi hải sản nướng thơm lừng len lỏi khắp các gian hàng."],featured:true,tour:"phu-quoc"},
{title:"Miền Tây sông nước: một ngày lênh đênh chợ nổi Cái Răng",loc:"Cần Thơ",region:"Nam",types:["Văn hóa","Ẩm thực"],cat:"Trải nghiệm người thật",author:"Trần Bảo Ngọc",read:4,rating:4.7,rev:132,excerpt:"Thức dậy từ bốn giờ sáng để kịp ra chợ nổi Cái Răng lúc nhộn nhịp nhất, nơi ghe thuyền tấp nập trao đổi trái cây và nông sản.",content:["Trời còn chưa sáng hẳn, hàng trăm chiếc ghe đã tụ về khúc sông, mỗi ghe treo một cây bẹo báo hiệu mặt hàng đang bán.","Một tô hủ tiếu nóng được múc ngay trên ghe, vừa ăn vừa lắc lư theo sóng nước là trải nghiệm khó nơi nào có được.","Sau chợ nổi, xuôi thuyền qua các miệt vườn trái cây trĩu quả ven sông trước khi trở về bến vào giữa trưa."]},
{title:"Côn Đảo tĩnh lặng: giữa lịch sử và biển xanh hoang sơ",loc:"Côn Đảo, Bà Rịa - Vũng Tàu",region:"Nam",types:["Biển","Văn hóa"],cat:"Điểm đến",author:"Ngô Thảo Vy",read:6,rating:4.9,rev:176,excerpt:"Hòn đảo mang trong mình những trang sử bi tráng nay là điểm đến cho ai muốn tìm một vùng biển thực sự yên tĩnh và trong lành.",content:["Nghĩa trang Hàng Dương lặng lẽ trong sương sớm, hương khói nghi ngút trên hàng nghìn ngôi mộ là những câu chuyện chưa kể hết.","Bãi Đầm Trầu chiều tà gần như không một dấu chân, chỉ có cát trắng, nước trong và hàng dừa nghiêng bóng.","Côn Đảo còn là nơi rùa biển lên bờ đẻ trứng, một trải nghiệm hiếm có nếu ghé đúng mùa từ tháng 5 đến tháng 10."]},
{title:"Mũi Né mùa gió: lướt ván diều trên đồi cát bay",loc:"Mũi Né, Bình Thuận",region:"Nam",types:["Biển","Thiên nhiên"],cat:"Trải nghiệm người thật",author:"Đinh Gia Bảo",read:5,rating:4.6,rev:84,excerpt:"Những cồn cát vàng, cát trắng nhấp nhô như sa mạc thu nhỏ, và Mũi Né còn là thiên đường của bộ môn lướt ván diều mùa gió lớn.",content:["Đồi cát bay đổi hình dạng liên tục theo từng cơn gió, in bóng những đứa trẻ trượt ván trên cát dưới nắng chiều.","Ngoài khơi, hàng chục cánh diều lướt ván đủ màu sắc lượn trên mặt biển, tận dụng gió mùa thổi mạnh từ tháng 11 đến tháng 4.","Suối Tiên gần đó với dòng nước cạn chảy qua các trụ cát đỏ tạo nên khung cảnh như một hẻm núi thu nhỏ."]},
{title:"Vũng Tàu cuối tuần: tắm biển, leo núi và hải sản Bãi Sau",loc:"Vũng Tàu",region:"Nam",types:["Biển","Ẩm thực"],cat:"Hành trình 48 giờ",author:"Bùi Ngọc Anh",read:4,rating:4.5,rev:61,excerpt:"Chỉ hai giờ chạy xe từ Sài Gòn, Vũng Tàu là lựa chọn quen thuộc cho chuyến đi ngắn ngày với biển, núi và hải sản tươi.",content:["Sáng sớm leo núi Nhỏ ngắm tượng Chúa Kitô, từ trên cao có thể nhìn thấy toàn cảnh thành phố biển trải dài.","Trưa tắm biển Bãi Sau rồi ghé chợ hải sản mua đồ tươi mang ra quán bên đường chế biến tại chỗ.","Buổi tối dạo Bãi Trước ngắm hoàng hôn, không khí biển mát rượi xua tan cái nóng của Sài Gòn."]},
{title:"Ẩm thực Hội An: hành trình qua cao lầu, mì Quảng và bánh mì Phượng",loc:"Hội An, Quảng Nam",region:"Trung",types:["Ẩm thực","Văn hóa"],cat:"Ẩm thực",author:"Mai Thanh Tâm",read:5,rating:4.9,rev:214,excerpt:"Một ngày ăn xuyên phố cổ: từ tô cao lầu đặc trưng chỉ Hội An mới có, đến ổ bánh mì Phượng nổi tiếng khắp thế giới.",content:["Cao lầu Hội An khác hẳn mì Quảng bởi sợi mì dai giòn đặc trưng, được làm từ nước giếng Bá Lễ theo công thức gia truyền.","Buổi trưa là tô mì Quảng đầy ắp tôm thịt, ăn kèm bánh đa nướng giòn rụm và rau sống tươi mát.","Kết thúc ngày bằng ổ bánh mì Phượng nóng giòn, lớp pate béo ngậy hòa cùng rau thơm - hương vị khiến du khách quốc tế phải xếp hàng dài."]},
{title:"Sa Pa mùa săn mây: trekking bản Cát Cát và thung lũng Mường Hoa",loc:"Sa Pa, Lào Cai",region:"Bắc",types:["Núi","Cắm trại"],cat:"Trải nghiệm người thật",author:"Đặng Tuấn Nghĩa",read:5,rating:4.8,rev:140,excerpt:"Cung trekking nhẹ nhàng hơn Fansipan, xuyên qua bản Cát Cát và thung lũng Mường Hoa, phù hợp cho người mới bắt đầu.",content:["Con đường mòn dẫn xuống bản Cát Cát băng qua những thửa ruộng bậc thang xanh mướt, xa xa là tiếng thác nước đổ.","Người Mông trong bản vẫn giữ nghề dệt lanh nhuộm chàm truyền thống, từng tấm vải được phơi dọc lối đi đầy màu sắc.","Đêm cắm trại giữa thung lũng Mường Hoa, sương giăng kín lều và tiếng côn trùng rả rích là ký ức khó quên."]}
];
A.forEach((a,i)=>{a.id=i+1;a.slug=a.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');a.grad=GRAD[a.types[0]];a.icon=ICON[a.types[0]];});

let state={q:'',region:null,types:new Set(),panelOpen:false,view:'list',current:null};

function matches(a){
  const q=state.q.trim().toLowerCase();
  if(q && !(a.title.toLowerCase().includes(q)||a.loc.toLowerCase().includes(q))) return false;
  if(state.region && a.region!==state.region) return false;
  if(state.types.size && ![...state.types].some(t=>a.types.includes(t))) return false;
  return true;
}
function activeFilterCount(){return (state.region?1:0)+state.types.size;}

function coverHTML(a,big){
  const bgStyle=a.img?`background-image:url('${a.img}');background-size:cover;background-position:center`:`background:linear-gradient(150deg,${a.grad[0]},${a.grad[1]})`;
  return `<div class="cover" style="${bgStyle}">
    ${a.img?'':`<span style="font-size:${big?'56px':'40px'}">${a.icon}</span>`}
    <div class="tag-row">
      <span class="badge"${big?' style="background:var(--amber)"':''}>${big?'Cẩm nang nổi bật':a.cat}</span>
      <span class="badge loc">📍 ${a.loc}</span>
    </div></div>`;
}
function cardHTML(a,dark){
  return `<article class="card${dark?' dark':''}" onclick="openArticle(${a.id})" tabindex="0" role="button">
    ${coverHTML(a,dark)}
    <div class="body">
      <h3>${a.title}</h3>
      <p class="exc">${a.excerpt}</p>
      <div class="meta-row">
        <div class="author"><div class="avatar">${a.author[0]}</div><span><b>${a.author}</b></span></div>
        <span class="dot-meta">${a.read} phút đọc</span>
      </div>
      <div class="meta-row" style="border-top:none;padding-top:0">
        <span class="rating"><span style="color:var(--amber)">★</span> ${a.rating.toFixed(1)} <span class="dot-meta">(${a.rev})</span></span>
        <span class="read-link">Đọc bài viết →</span>
      </div>
    </div></article>`;
}

function renderList(){
  const filtered=A.filter(matches);
  const featured=filtered.filter(a=>a.featured);
  const latest=filtered.filter(a=>!a.featured);
  const fc=activeFilterCount();
  const quick=['Biển','Núi','Văn hóa','Ẩm thực','Road trip'];

  let html=`
  <div style="position:relative" class="search-panel">
  <div class="page-head-inner"><h1>Khám phá điểm đến</h1><p>Những câu chuyện, mẹo hay và hành trình có thật để bạn tìm cảm hứng trước khi đặt tour.</p></div>
  <div class="toolbar">
    <div class="search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input id="q" placeholder="Tìm điểm đến, chủ đề, tên bài viết..." value="${state.q.replace(/"/g,'&quot;')}" oninput="state.q=this.value;render()"></div>
    <button class="filter-btn${fc?' active-filters':''}" onclick="state.panelOpen=!state.panelOpen;render()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
      Bộ lọc ${fc?`<span class="filter-count">${fc}</span>`:''}</button>
  </div>
  <div class="chips">${quick.map(t=>`<div class="chip${state.types.has(t)?' on':''}" onclick="toggleType('${t}')">${ICON[t]} ${t}</div>`).join('')}</div>
  ${state.panelOpen?panelHTML():''}
  </div>`;

  if(filtered.length===0){
    html+=`<div class="empty"><div class="ic">🧭</div><h3>Không tìm thấy bài viết phù hợp</h3><p>Thử từ khóa khác hoặc bỏ bớt bộ lọc đang chọn.</p>
      <button class="btn-primary" style="margin-top:14px" onclick="clearFilters()">Xóa bộ lọc</button></div>`;
    document.getElementById('app').innerHTML=html;return;
  }
  if(featured.length){
    html+=`<div class="sec-head"><h2>Bài viết nổi bật</h2></div><div class="featured-grid">
      ${featured.slice(0,3).map((a,i)=>cardHTML(a,i===0)).join('')}</div>`;
  }
  html+=`<div class="sec-head"><h2>Mới nhất</h2><span>${latest.length} bài viết</span></div>
    <div class="grid3">${latest.map(a=>cardHTML(a,false)).join('')}</div>`;
  document.getElementById('app').innerHTML=html;
}

function panelHTML(){
  return `<div class="scrim" onclick="state.panelOpen=false;render()"></div>
  <div class="filter-panel" onclick="event.stopPropagation()">
    <h4>Khu vực</h4>
    <div class="opt-row">${REGIONS.map(r=>`<div class="opt${state.region===r?' on':''}" onclick="setRegion('${r}')">${r}</div>`).join('')}</div>
    <h4>Loại trải nghiệm</h4>
    <div class="opt-row">${TYPES.map(t=>`<div class="opt${state.types.has(t)?' on':''}" onclick="toggleType('${t}')">${ICON[t]} ${t}</div>`).join('')}</div>
    <div class="filter-actions"><button class="link-btn" onclick="clearFilters()">Xóa tất cả</button>
      <button class="btn-primary" onclick="state.panelOpen=false;render()">Xem kết quả</button></div>
  </div>`;
}
function setRegion(r){state.region=state.region===r?null:r;render();}
function toggleType(t){state.types.has(t)?state.types.delete(t):state.types.add(t);render();}
function clearFilters(){state.q='';state.region=null;state.types.clear();state.panelOpen=false;render();}

function openArticle(id){state.current=A.find(a=>a.id===id);state.view='detail';window.scrollTo(0,0);render();}
function backToList(){state.view='list';state.current=null;render();}

function renderDetail(){
  const a=state.current;
  document.getElementById('app').innerHTML=`
  <div class="detail">
    <div class="back" onclick="backToList()">← Quay lại danh sách</div>
    <div class="d-cover" style="${a.img?`background-image:url('${a.img}');background-size:cover;background-position:center`:`background:linear-gradient(150deg,${a.grad[0]},${a.grad[1]})`}">${a.img?'':`<span>${a.icon}</span>`}</div>
    <div class="d-head">
      <div class="d-tags"><span class="badge" style="background:var(--blue-dim);color:var(--blue)">${a.cat}</span>
        <span class="badge" style="background:var(--amber-dim);color:#8A5A00">📍 ${a.loc}</span></div>
      <h1>${a.title}</h1>
      <div class="d-meta">
        <div class="author"><div class="avatar">${a.author[0]}</div><span><b>${a.author}</b></span></div>
        <span class="dot-meta">${a.read} phút đọc</span>
        <span class="rating"><span style="color:var(--amber)">★</span> ${a.rating.toFixed(1)} <span class="dot-meta">(${a.rev} đánh giá)</span></span>
      </div>
    </div>
    <div class="d-content">${a.content.map(p=>`<p>${p}</p>`).join('')}</div>
    <div class="tour-cta"><div><h4>Sẵn sàng cho chuyến đi này?</h4><p>Xem các tour gợi ý cho ${a.loc} và đặt chỗ chỉ trong vài phút.</p></div>
      <a class="tour-btn" href="#/dich-vu/tour/${a.tour||a.slug}">Xem tour &amp; đặt tour →</a></div>
  </div>`;
}

function render(){
  const active=document.activeElement;
  const activeId=active&&active.id;
  const selStart=active&&typeof active.selectionStart==='number'?active.selectionStart:null;
  const selEnd=active&&typeof active.selectionEnd==='number'?active.selectionEnd:null;
  state.view==='detail'?renderDetail():renderList();
  if(activeId){
    const el=document.getElementById(activeId);
    if(el){
      el.focus();
      if(selStart!==null&&el.setSelectionRange){try{el.setSelectionRange(selStart,selEnd);}catch(e){}}
    }
  }
}
render();
