import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

// Email to shift timing mapping from the INSERT statement
const emailShiftMappings = {
  'amsoni0313@gmail.com': '8:30 AM - 5:30 PM',
  'faizasiddique886@gmail.com': '9:00 AM - 6:00 PM',
  'sarfarazmuhammad550@gmail.com': '9:00 AM - 6:00 PM',
  'Awasranaawas@gmail.com': '9:00 AM - 6:00 PM',
  'atchayapk26@gmail.com': '9:00 AM - 6:00 PM',
  'Jasmeetkaur4856@gmail.com': '9:00 AM - 6:00 PM',
  'iqranaseem068@gmail.com': '9:00 AM - 6:00 PM',
  'Tusi.marathe1980@gmail.com': '9:00 AM - 6:00 PM',
  'sohailathar77@gmail.com': '9:00 AM - 6:00 PM',
  'shreelatakutty@gmail.com': '9:00 AM - 6:00 PM',
  'hiren1998parmar@gmail.com': '9:00 AM - 6:00 PM',
  'amankshatriya22@gmail.com': '9:00 AM - 6:00 PM',
  'sandeepbangar32@gmail.com': '9:00 AM - 6:00 PM',
  'sainabashefie@gmail.com': '9:00 AM - 6:00 PM',
  'bbalraj475@gmail.com': '9:00 AM - 6:00 PM',
  'maazkhanm321@gmail.com': '9:00 AM - 6:00 PM',
  'vinitlalwani475@gmail.com': '9:00 AM - 6:00 PM',
  'gautamnagde7521@gmail.com': '9:00 AM - 6:00 PM',
  'hinatrivedi29@gmail.com': '9:00 AM - 6:00 PM',
  'bakhtawar.naeem3@gmail.com': '9:00 AM - 6:00 PM',
  'Muhammadyaseentajamal@gmail.com': '9:00 AM - 6:00 PM',
  'nabiamozumder@gmail.com': '9:00 AM - 6:00 PM',
  'minisalhotra3@gmail.com': '9:00 AM - 6:00 PM',
  'arsheenwani11@gmail.com': '9:00 AM - 6:00 PM',
  'Joedifoster17@gmail.com': '9:00 AM - 6:00 PM',
  'Mughalzaad@outlook.com': '9:00 AM - 6:00 PM',
  'shethpurva.2011@gmail.com': '9:00 AM - 6:00 PM',
  'afzalkhanbagwan10@gmail.com': '9:00 AM - 6:00 PM',
  'faizan03117990229@gmail.com': '9:00 AM - 6:00 PM',
  'shakeelidrishi963@gmail.com': '9:00 AM - 6:00 PM',
  'mariamalik04@icloud.com': '9:00 AM - 6:00 PM',
  'missilma786@gmail.com': '9:00 AM - 6:00 PM',
  'muskaan261199@gmail.com': '9:00 AM - 6:00 PM',
  'jassalsunil2@gmail.com': '9:00 AM - 6:00 PM',
  'lipshitabarik@gmail.com': '9:00 AM - 6:00 PM',
  'Jyothicsk@gmail.com': '9:00 AM - 6:00 PM',
  'madhavanm4@gmail.com': '9:00 AM - 6:00 PM',
  'Meenalokeshchittor@gmail.com': '9:00 AM - 6:00 PM',
  'humasaleem173@gmail.com': '9:00 AM - 6:00 PM',
  'venkimeena2003@gmail.com': '9:00 AM - 6:00 PM',
  'Mehrujamal30@gmail.com': '9:00 AM - 6:00 PM',
  'Param@gmail.com': '9:00 AM - 6:00 PM',
  'sidhantdora3@gmail.com': '9:00 AM - 6:00 PM',
  'aneenanasreen@gmail.com': '9:00 AM - 6:00 PM',
  'urudikprajapati78029@gmail.com': '9:00 AM - 6:00 PM',
  'smartrahim786786@gmail.com': '9:00 AM - 6:00 PM',
  'rayyanab2005@gmail.com': '9:00 AM - 6:00 PM',
  'prajapatihardikhardik044@gmail.com': '9:00 AM - 6:00 PM',
  'shabin75981@gmail.com': '9:00 AM - 6:00 PM',
  'divyareddykovvuri455@gmail.com': '9:00 AM - 6:00 PM',
  'ramzanrong5@gmail.com': '9:00 AM - 6:00 PM',
  'srushtipulekar02@gmail.com': '9:00 AM - 6:00 PM',
  'Ghija9310@gmail.com': '9:00 AM - 6:00 PM',
  'afraansheikh0@gmail.com': '9:00 AM - 6:00 PM',
  'unazim1997@gmail.com': '9:00 AM - 6:00 PM',
  'shaiksalman1606@gmail.com': '9:00 AM - 6:00 PM',
  'afridishaik39@gmail.com': '9:00 AM - 6:00 PM',
  'ezmdxb@gmail.com': '9:00 AM - 6:00 PM',
  'nikhilbairagi0506@gmail.com': '9:00 AM - 6:00 PM',
  'evange2226@gmail.com': '9:00 AM - 6:00 PM',
  'mohd.saud838@gmail.com': '9:00 AM - 6:00 PM',
  'aneelaalam57@gmail.com': '9:00 AM - 6:00 PM',
  'premlulla59@gmail.com': '9:00 AM - 6:00 PM',
  'harrisplkd@gmail.com': '9:00 AM - 6:00 PM',
  'nishamohammed091@gmail.com': '9:00 AM - 6:00 PM',
  'aashishhumagain124@gmail.com': '9:00 AM - 6:00 PM',
  'madhubalaoct2001@gmail.com': '9:00 AM - 6:00 PM',
  'Ukrsaif@gmail.com': '9:00 AM - 6:00 PM',
  'Rajeshwarilingam96@gmail.com': '9:00 AM - 6:00 PM',
  'marysudheer.t@gmail.com': '9:00 AM - 6:00 PM',
  'bhooshunbhooshun@gmail.com': '9:00 AM - 6:00 PM',
  'chaudharyfirozkhan@gmail.com': '9:00 AM - 6:00 PM',
  'altamashshaikh5060@gmail.com': '9:00 AM - 6:00 PM',
  'forexnyctrader@gmail.com': '9:00 AM - 6:00 PM',
  'preethikapreeofc@gmail.com': '9:00 AM - 6:00 PM',
  'sajaykumar868@gmail.com': '9:00 AM - 6:00 PM',
  'singhke250104@gmail.com': '9:00 AM - 6:00 PM',
  'Irfan797502@gmail.com': '9:00 AM - 6:00 PM',
  'Prasennakrish23@gmail.com': '9:00 AM - 6:00 PM',
  'alameenburhan2003@gmail.com': '9:00 AM - 6:00 PM',
  'farazs1401@gmail.com': '9:00 AM - 6:00 PM',
  'ahaliyapadman8301@gmail.com': '9:00 AM - 6:00 PM',
  'jayini2020@gmail.com': '9:00 AM - 6:00 PM',
  'abeerakaleem1809@gmail.com': '9:00 AM - 6:00 PM',
  'Sakshipote7@gmail.com': '9:00 AM - 6:00 PM',
  'Snehavarghese770@gmail.com': '9:00 AM - 6:00 PM',
  'harsinidk@gmail.com': '9:00 AM - 6:00 PM',
  'Hnbhoskar@gmail.com': '9:00 AM - 6:00 PM',
  'Manoharpalleti5@gmail.com': '9:00 AM - 6:00 PM',
  'kinjalgorvadiya95@gmail.com': '9:00 AM - 6:00 PM',
  'menekshafernando@gmail.com': '9:00 AM - 6:00 PM',
  'Siyarsh78@gmail.com': '9:00 AM - 6:00 PM',
  'mohsinsalemm888@gmail.com': '9:00 AM - 6:00 PM',
  'hsarathnair@gmail.com': '9:00 AM - 6:00 PM',
  'zaveri.krunal@gmail.com': '9:00 AM - 6:00 PM',
  'Saadmba3.5@gmail.com': '9:00 AM - 6:00 PM',
  'zaindani1100@gmail.com': '9:00 AM - 6:00 PM',
  'rajamadan2005@gmail.com': '9:00 AM - 6:00 PM',
  'jasminims.j@gmail.com': '9:00 AM - 6:00 PM',
  '98fkanij@gmail.com': '9:00 AM - 6:00 PM',
  'Parminderkataria805@gmail.com': '9:00 AM - 6:00 PM',
  'Syedshdl@gmail.com': '9:00 AM - 6:00 PM',
  'vamshipatel66@gmail.com': '9:00 AM - 6:00 PM',
  'ahamadirshad384@gmail.com': '9:00 AM - 6:00 PM',
  'raj.rao14490@gmail.com': '9:00 AM - 6:00 PM',
  'amit.soni@company.com': '8:30 AM - 5:30 PM',
  'mikmarlamo698@gmail.com': '9:00 AM - 6:00 PM',
  'irfanghyann@gmail.com': '9:00 AM - 6:00 PM',
  'Bhumikathapamagar771@gmail.com': '8:30 AM - 5:30 PM',
  'ashu42668@gmail.com': '9:00 AM - 6:00 PM',
  'afshanpawaskar1997@gmail.com': '9:00 AM - 6:00 PM',
  'fnehaal120@gmail.com': '9:00 AM - 6:00 PM',
  'Althafharis321@gmail.com': '9:00 AM - 6:00 PM',
  'kshafique953@gmail.com': '9:00 AM - 6:00 PM',
  'hadiamohsin9652@gmail.com': '9:00 AM - 6:00 PM',
  'umairjaved081@gmail.com': '9:00 AM - 6:00 PM',
  'ruchipatil2575@gmail.com': '9:00 AM - 6:00 PM',
  'kaursimarpreet1825@gmail.com': '9:00 AM - 6:00 PM',
  'Nivadas.dxb@gmail.com': '9:00 AM - 6:00 PM',
  'sg3252514@gmail.com': '9:00 AM - 6:00 PM',
  'chaudharymohit9680@gmail.com': '9:00 AM - 6:00 PM',
  'mehrakamalsingh803@gmail.com': '9:00 AM - 6:00 PM',
  'hussnainghafoor55535@gmail.com': '9:00 AM - 6:00 PM',
  'chirayathphinson@gmail.com': '9:00 AM - 6:00 PM',
  'vickyv075@gmail.com': '9:00 AM - 6:00 PM',
  'senghaniy2407@gmail.com': '9:00 AM - 6:00 PM',
  'ritesh.mago@gmail.com': '9:00 AM - 6:00 PM',
  'mohamedparvesh370@gmail.com': '9:00 AM - 6:00 PM',
  'mohammedshakeel7766@gmail.com': '9:00 AM - 6:00 PM',
  'rasikam334@gmail.com': '9:00 AM - 6:00 PM',
  'anirajput896@gmail.com': '9:00 AM - 6:00 PM',
  'abdulwahabrafiqueuae@gmail.com': '9:00 AM - 6:00 PM',
  'virdi2068@gmail.com': '9:00 AM - 6:00 PM',
  'sajitinz@gmail.com': '9:00 AM - 6:00 PM',
  'amithgudipati@gmail.com': '9:00 AM - 6:00 PM',
  'bhatasuu222@gmail.com': '9:00 AM - 6:00 PM',
  'usamamahboob00@gmail.com': '9:00 AM - 6:00 PM',
  'monikabharadwaj64@gmail.com': '9:00 AM - 6:00 PM',
  'msaimkhan32102@gmail.com': '9:00 AM - 6:00 PM',
  'kabilanbrindha72@gmail.com': '9:00 AM - 6:00 PM',
  'shaziasajid32@gmail.com': '9:00 AM - 6:00 PM',
  'farahshaheen000@gmail.com': '9:00 AM - 6:00 PM',
  'gmhasal@gmail.com': '9:00 AM - 6:00 PM',
  'prachiraval2709@gmail.com': '9:00 AM - 6:00 PM',
  'manmit0706@gmail.com': '9:00 AM - 6:00 PM',
  'aqsatabussam757@gmail.com': '9:00 AM - 6:00 PM',
  'syedrahman2004@gmail.com': '9:00 AM - 6:00 PM',
  'Sanifahmed88@gmail.com': '9:00 AM - 6:00 PM',
  'bharathpatel6931@gmail.com': '9:00 AM - 6:00 PM',
  'Hubliker9@gmail.com': '9:00 AM - 6:00 PM',
  'abhi.m079@gmail.com': '9:00 AM - 6:00 PM',
  'nnavsekhon@gmail.com': '9:00 AM - 6:00 PM',
  'mumtazkanwal51@gmail.com': '9:00 AM - 6:00 PM',
  'saharriaz7@gmail.com': '9:00 AM - 6:00 PM',
  'naidusattaru1994@gmail.com': '9:00 AM - 6:00 PM',
  'priyatharshinisenthilkumar1003@gmail.com': '9:00 AM - 6:00 PM',
  'npkkarthik@gmail.com': '9:00 AM - 6:00 PM',
  'bareerafathima2000@gmail.com': '9:00 AM - 6:00 PM',
  'praveen349smart@gmail.com': '9:00 AM - 6:00 PM',
  'poonambhadoriya1399@gmail.com': '9:00 AM - 6:00 PM',
  'Binastha247@gmail.com': '9:00 AM - 6:00 PM',
  'sameermuhammed099@gmail.com': '9:00 AM - 6:00 PM',
  'Naseematara76@gmail.com': '9:00 AM - 6:00 PM',
  'shahinasheikh24@gmail.com': '9:00 AM - 6:00 PM',
  'fouziya.sayyed19@gmail.com': '9:00 AM - 6:00 PM',
  'afrojamajumder25@gmail.com': '9:00 AM - 6:00 PM',
  'arjanpreetsingh85@gmail.com': '9:00 AM - 6:00 PM',
  'ali.shazan888@gmail.com': '9:00 AM - 6:00 PM',
  'syedsabeel218@gmail.com': '9:00 AM - 6:00 PM',
  'nameermerchant22@gmail.com': '9:00 AM - 6:00 PM',
  'mahishaikh1318@gmail.com': '9:00 AM - 6:00 PM',
  'rasiksalimas@gmail.com': '9:00 AM - 6:00 PM',
  'vnanda778@gmail.com': '9:00 AM - 6:00 PM',
  'rameezahamed142@gmail.com': '9:00 AM - 6:00 PM',
  'fh3163707@gmail.com': '9:00 AM - 6:00 PM',
  'yakubadnaan3@gmail.com': '9:00 AM - 6:00 PM',
  'niralidharia2003@gmail.com': '9:00 AM - 6:00 PM',
  'nandabala.wales@gmail.com': '9:00 AM - 6:00 PM',
  'bilalansari5654@gmail.com': '9:00 AM - 6:00 PM',
  'Munaziya1996@gmail.com': '9:00 AM - 6:00 PM',
  'kumarjuttiga@gmail.com': '9:00 AM - 6:00 PM',
  'pabitrasonar.1995@gmail.com': '9:00 AM - 6:00 PM',
  'inaya.sana01@gmail.com': '9:00 AM - 6:00 PM',
  'sahilazoo143@gmail.com': '9:00 AM - 6:00 PM',
  'awaisrasool69@gmail.com': '9:00 AM - 6:00 PM',
  'mshariq38720@gmail.com': '9:00 AM - 6:00 PM',
  'Razalodhi0987@gmail.com': '9:00 AM - 6:00 PM',
  'arslan55db@gmail.com': '9:00 AM - 6:00 PM',
  'smileyq272@gmail.com': '9:00 AM - 6:00 PM',
  'saimasiddique431@gmail.com': '9:00 AM - 6:00 PM',
  'arain.burhan@yahoo.com': '9:00 AM - 6:00 PM',
  'Fatimanouman2096@gmail.com': '9:00 AM - 6:00 PM',
  'deekshithaacharya1111@gmail.com': '9:00 AM - 6:00 PM',
  'heyahmed011@gmail.com': '9:00 AM - 6:00 PM',
  'thecaretfc82@gmail.com': '9:00 AM - 6:00 PM',
  'raya12rana@gmail.com': '9:00 AM - 6:00 PM',
  'Srujanj211@gmail.com': '9:00 AM - 6:00 PM',
  'mayurvasava200@gmail.com': '9:00 AM - 6:00 PM',
  'charusodhi606@gmail.com': '9:00 AM - 6:00 PM',
  'deepikakubendrank1998@gmail.com': '9:00 AM - 6:00 PM',
  'tejasrajput869@gmail.com': '9:00 AM - 6:00 PM',
  'khanyasirxyz72@gmail.com': '9:00 AM - 6:00 PM',
  'Mohamedyasaryf@gmail.com': '9:00 AM - 6:00 PM',
  'shabshaikh7894@gmail.com': '9:00 AM - 6:00 PM',
  'sumeetkanmandae@gmail.com': '9:00 AM - 6:00 PM',
  'Liyakhat69@gmail.com': '9:00 AM - 6:00 PM',
  'Ismailnishadxb110@gmail.com': '9:00 AM - 6:00 PM',
  'mdimran26533@gmail.com': '8:30 AM - 5:30 PM',
  'shaikhaamir056@gmail.com': '9:30 AM - 6:30 PM',
  'sahilmalik0234@gmail.com': '9:00 AM - 6:00 PM',
  'sunitarani09876543@gmail.com': '9:00 AM - 6:00 PM',
  'Shanawazmohdabdul@gmail.com': '9:00 AM - 6:00 PM',
  'pradeeptimilsina10@gmail.com': '9:00 AM - 6:00 PM',
  'vivekpatil2418@gmail.com': '9:00 AM - 6:00 PM',
  'Veenapatil7676@gmail.com': '9:00 AM - 6:00 PM',
  'umermohamed23@gmail.com': '9:00 AM - 6:00 PM',
  'mounasree189@gmail.com': '9:00 AM - 6:00 PM',
  'nazanam924@gmail.com': '9:00 AM - 6:00 PM',
  'ahmedrameez185@gmail.com': '9:00 AM - 6:00 PM',
  'mahinrahman976199@gmail.com': '9:00 AM - 6:00 PM',
  'khatiwadam075@gmail.com': '9:00 AM - 6:00 PM',
  'ranusahu201998@gmail.com': '9:00 AM - 6:00 PM',
  'ffunnybabydoll@gmail.com': '9:00 AM - 6:00 PM',
  'yonadhinakarr@gmail.com': '9:00 AM - 6:00 PM',
  'tejoo.lprasad@gmail.com': '9:00 AM - 6:00 PM',
  'mianfaisal003@gmail.com': '9:00 AM - 6:00 PM',
  'jaideepbhatia.09@gmail.com': '9:00 AM - 6:00 PM',
  'jankisuhagiya16@gmail.com': '9:00 AM - 6:00 PM',
  'dhartisuhagiya2533@gamil.com': '9:00 AM - 6:00 PM',
  'Vamsireddy010@gmail.com': '9:00 AM - 6:00 PM',
  'ramandeepsingh14605@gmail.com': '9:00 AM - 6:00 PM',
  'Syedhammadshah194@gmail.com': '9:00 AM - 6:00 PM',
  'harrypatel65389@gmail.com': '9:00 AM - 6:00 PM',
  'sa.chandrika28@gmail.com': '9:00 AM - 6:00 PM',
  'rizwanaayshu@gmail.com': '9:00 AM - 6:00 PM',
  'Vishalsingh1909@gmail.com': '9:00 AM - 6:00 PM',
  'mansooriaamir538@gmail.com': '9:00 AM - 6:00 PM',
  'afridmohammad6270@gmail.com': '9:00 AM - 6:00 PM',
  'chaudharyrizwal@gmail.com': '9:00 AM - 6:00 PM',
  'amirarshadofficial9298@gmail.com': '9:00 AM - 6:00 PM',
  'zsaadkhan89@gmail.com': '9:00 AM - 6:00 PM',
  'Gullrajpoot25@gmail.com': '9:00 AM - 6:00 PM',
  'Samridhibhatia186@gmail.com': '9:00 AM - 6:00 PM',
  'anjalirana14450@gmail.com': '9:00 AM - 6:00 PM',
  'aman26242@gmail.com': '9:00 AM - 6:00 PM',
  'gh861759@gmail.com': '9:00 AM - 6:00 PM',
  'dhruvidobariya3021@gmail.com': '9:00 AM - 6:00 PM',
  'neelimabaniyar31@gmail.com': '9:00 AM - 6:00 PM',
  'zohashk19@gmail.com': '9:00 AM - 6:00 PM',
  'Swathi18skulal@gmail.com': '9:00 AM - 6:00 PM',
  'mdrakibulhasan5963@gmail.com': '9:00 AM - 6:00 PM',
  'muhammedkenstp@gmail.com': '9:00 AM - 6:00 PM',
  'paidi.appalanaidu@gmail.com': '9:00 AM - 6:00 PM',
  'sanaamreen.arham@gmail.com': '9:00 AM - 6:00 PM',
  'bagyasivakumar609@gmail.com': '9:00 AM - 6:00 PM',
  'mamtat513@gmail.com': '9:00 AM - 6:00 PM',
  'Sabau1250@gmail.com': '9:00 AM - 6:00 PM',
  'zainishah534@gmail.com': '9:00 AM - 6:00 PM',
  'rajeshbokka02@gmail.com': '9:00 AM - 6:00 PM',
  'hafizakhatib93@gmail.com': '9:00 AM - 6:00 PM',
  'lavanyak3093@gmail.com': '9:00 AM - 6:00 PM',
  'husnaperveen3@gmail.com': '9:00 AM - 6:00 PM',
  'sidsajid952@gmail.com': '9:00 AM - 6:00 PM',
  'maxsammahi47@gmail.com': '9:00 AM - 6:00 PM',
  'faraz.shakirdxb@gmail.com': '9:00 AM - 6:00 PM',
  'asfiaansari02@gmail.com': '9:00 AM - 6:00 PM',
  'Yashvipanchal15@gmail.com': '9:00 AM - 6:00 PM',
  'naeemkareem2531@gmail.com': '9:00 AM - 6:00 PM',
  'aiqamunsif123@gmail.com': '9:00 AM - 6:00 PM',
  'Shaikhnoormd2@gmail.com': '9:00 AM - 6:00 PM',
  'sibghatalnoor@gmail.com': '9:00 AM - 6:00 PM',
  'Jayshreepriyank2401@gmail. Com': '9:00 AM - 6:00 PM',
  'ektap785@gmail.com': '9:00 AM - 6:00 PM',
  'bubloocrack56@gmail.com': '9:00 AM - 6:00 PM',
  'ayub5931@gmail.com': '9:00 AM - 6:00 PM',
  'mahrukhrajpoot776@gmail.com': '9:00 AM - 6:00 PM',
  'khanshahil45@yahoo.com': '9:00 AM - 6:00 PM',
  'Manzoormehdi72@gmail.com': '9:00 AM - 6:00 PM',
  'ashishdas4141@gmail.com': '9:00 AM - 6:00 PM',
  'kapadiavishwa096@gmail.com': '9:00 AM - 6:00 PM',
  'deepamnu3747@gmail.com': '9:00 AM - 6:00 PM',
  'shabbirbhaikijai5@gmail.com': '9:00 AM - 6:00 PM',
  'shivambarik7@gmail.com': '9:00 AM - 6:00 PM',
  'sheelamanohar97@gmail.com': '9:00 AM - 6:00 PM',
  'chughreet09@gmail.com': '9:00 AM - 6:00 PM',
  'shitalkanhegaonkar96@gmail.com': '9:00 AM - 6:00 PM',
  'steffijasmine14@gmail.com': '9:00 AM - 6:00 PM',
  'Kamranather2000@gmail.com': '9:00 AM - 6:00 PM',
  'arjunashu122@gmail.com': '9:00 AM - 6:00 PM',
  'Shifarizan@gmail.com': '9:00 AM - 6:00 PM',
  'Mr.kumar9797@gmail.com': '9:00 AM - 6:00 PM',
  'syedmohsin80@gmail.com': '9:00 AM - 6:00 PM',
  'sohailmohammed272@gmail.com': '9:00 AM - 6:00 PM',
  'shohansoon669@gmail.com': '9:00 AM - 6:00 PM',
  'bhagatparidhi2201@gmail.com': '9:00 AM - 6:00 PM',
  'salmaniqbal05@gmail.com': '9:00 AM - 6:00 PM',
  'pavi56050@gmail.com': '9:00 AM - 6:00 PM',
  'tejashwinideeps@gmail.com': '9:00 AM - 6:00 PM',
  'Saddamazeem1415@gmail.com': '9:00 AM - 6:00 PM',
  'ramaravikiran@yahoo.com': '9:00 AM - 6:00 PM',
  'hinalpatil0703@gmail.com': '9:00 AM - 6:00 PM',
  'askproduction324@gmail.com': '9:00 AM - 6:00 PM',
  'ramesh25mur@gmail.com': '9:00 AM - 6:00 PM',
  'iqbalamjad36@gmail.com': '9:00 AM - 6:00 PM',
  'jyoti.sharma66921@gmail.com': '9:00 AM - 6:00 PM',
  'Ranimariya1321@gmail.com': '9:00 AM - 6:00 PM',
  'zubairajmal6@gmail.com': '9:00 AM - 6:00 PM',
  'irfansaifi902@gmail.com': '9:00 AM - 6:00 PM',
  'hiraasif091@gmail.com': '9:00 AM - 6:00 PM',
  'abdulsulthana1610@gmail.com': '9:00 AM - 6:00 PM',
  'isranigautam217@gmail.com': '9:00 AM - 6:00 PM',
  'darshan1593patel@gmail.com': '9:00 AM - 6:00 PM',
  'hamayalaltaf37@gmail.com': '9:00 AM - 6:00 PM',
  'akshayudugade007@gmail.com': '9:00 AM - 6:00 PM',
  'neha081997@gmail.com': '9:00 AM - 6:00 PM',
  'athiraliju0590@gmail.com': '9:00 AM - 6:00 PM',
  'nishakoshti1997@gmail.com': '9:00 AM - 6:00 PM',
  'sandhyapraveen2000@gmail.com': '9:00 AM - 6:00 PM',
  'Noorkulsum98@gmail.com': '9:00 AM - 6:00 PM',
  'syedaleem01.in@gmail.com': '9:00 AM - 6:00 PM',
  'kapadiyakhushbu1410@gmail.com': '9:00 AM - 6:00 PM',
  'mohammedsafwan966344@gmail.com': '9:00 AM - 6:00 PM',
  'nitin.lakhmichand@gmail.com': '9:00 AM - 6:00 PM',
  'muniraasalim23@gmail.com': '9:00 AM - 6:00 PM',
  'pavanakul12@gmail.com': '9:00 AM - 6:00 PM',
  'shvishu28jeet@gmail.com': '9:00 AM - 6:00 PM',
  'nargisrizwan494@gmail.com': '9:00 AM - 6:00 PM'
};

async function updateShiftTimings() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');
    
    let updateCount = 0;
    let notFoundCount = 0;
    
    console.log('Starting shift timing updates...');
    
    for (const [email, shiftTiming] of Object.entries(emailShiftMappings)) {
      try {
        // Update shift_timings for employees with matching email
        const [result] = await connection.execute(
          'UPDATE employees SET shift_timings = ? WHERE email = ?',
          [shiftTiming, email]
        );
        
        if (result.affectedRows > 0) {
          updateCount++;
          console.log(`✓ Updated shift timing for ${email}: ${shiftTiming}`);
        } else {
          notFoundCount++;
          console.log(`⚠ No employee found with email: ${email}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${email}:`, error.message);
      }
    }
    
    console.log('\n=== UPDATE SUMMARY ===');
    console.log(`Total emails processed: ${Object.keys(emailShiftMappings).length}`);
    console.log(`Successfully updated: ${updateCount}`);
    console.log(`Not found: ${notFoundCount}`);
    
    // Now get employees whose shift timings were not updated
    console.log('\n=== EMPLOYEES WITH UNCHANGED SHIFT TIMINGS ===');
    const [rows] = await connection.execute(`
      SELECT id, employeeId, name, email, shift_timings 
      FROM employees 
      WHERE email NOT IN (${Object.keys(emailShiftMappings).map(() => '?').join(',')})
      ORDER BY id
    `, Object.keys(emailShiftMappings));
    
    console.log(`Found ${rows.length} employees whose shift timings were not updated:`);
    rows.forEach(employee => {
      console.log(`ID: ${employee.id}, Employee ID: ${employee.employeeId}, Name: ${employee.name}, Email: ${employee.email || 'NO EMAIL'}, Current Shift: ${employee.shift_timings || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('Database connection error:', error.message);
    // Try alternative database name
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('Trying alternative database name: payroll_management');
      try {
        const altDbConfig = { ...dbConfig, database: 'payroll_management' };
        connection = await mysql.createConnection(altDbConfig);
        console.log('Connected to alternative database successfully');
        // Repeat the same logic here if needed
      } catch (altError) {
        console.error('Alternative database connection also failed:', altError.message);
      }
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Execute the update
updateShiftTimings().catch(console.error);
