import Link from "next/link";

import DockerToc from "@/app/docker/_components/DockerToc";

/** EC2 인스턴스(서버) 생성 단계 */
const ec2CreateSteps = [
  {
    step: 1,
    title: "리전(Region)을 서울로 설정",
    description:
      "AWS 콘솔 오른쪽 위에서 리전을 서울(ap-northeast-2)로 변경한 뒤 EC2 인스턴스를 만듭니다. 리전이 다르면 만든 서버가 목록에 보이지 않습니다.",
  },
  {
    step: 2,
    title: "키 페어(Key pair) 생성·저장",
    description:
      "새 키 페어를 만들고 .pem 파일을 내려받아 안전한 곳에 보관합니다. 이 파일이 있어야 서버에 접속할 수 있고, 분실하면 다시 받을 수 없습니다.",
    note: "Windows에서 PuTTY로 접속한다면 .ppk 형식으로 받거나 PuTTYgen으로 변환합니다.",
  },
  {
    step: 3,
    title: "스토리지 30GB 설정",
    description:
      "스토리지 구성에서 볼륨 크기를 30GB로 지정합니다. 프리 티어는 30GB까지 무료입니다.",
  },
  {
    step: 4,
    title: "탄력적 IP(Elastic IP) 연결",
    description:
      "인스턴스를 껐다 켜면 공인 IP가 바뀝니다. 탄력적 IP를 할당한 뒤 인스턴스에 연결하면 항상 같은 주소로 접속할 수 있습니다.",
    note: "탄력적 IP 주소 할당 → 작업 → 탄력적 IP 주소 연결 → 인스턴스 선택",
  },
];

/** 내 PC에서 EC2 접속 방법 (OS별) */
const ec2ConnectGuides = [
  {
    os: "macOS · Linux",
    description:
      "키 파일 권한을 400(소유자 읽기 전용)으로 바꾼 뒤 ssh로 접속합니다. 권한이 열려 있으면 접속이 거부됩니다.",
    code: `chmod 400 my-key-pair.pem
ssh -i my-key-pair.pem ubuntu@탄력적IP`,
  },
  {
    os: "Windows (PuTTY)",
    description:
      "PuTTYgen으로 .pem을 .ppk로 변환한 뒤, PuTTY에서 키 파일을 지정하고 접속합니다.",
    code: `1. PuTTYgen 실행 → my-key-pair.pem 불러오기 → my-key-pair.ppk 저장
2. PuTTY → Connection → SSH → Auth → Credentials → .ppk 파일 선택
3. Session → Host Name: ubuntu@탄력적IP → Open`,
  },
];

/** 접속 직후 확인하는 기본 명령어 */
const shellBasicCommands = [
  {
    command: "whoami",
    summary: "지금 로그인한 사용자 이름 확인",
    code: "whoami",
  },
  {
    command: "pwd",
    summary: "현재 위치한 디렉터리 경로 출력",
    code: "pwd",
  },
  {
    command: "ls",
    summary: "현재 디렉터리의 파일·폴더 목록 출력",
    code: `ls
ls -a
ls -l
ls -al`,
  },
  {
    command: "sudo apt-get update",
    summary: "패키지 목록 갱신 (서버 접속 후 가장 먼저 실행)",
    code: "sudo apt-get update",
  },
];

/** ls 옵션 */
const lsOptions = [
  { flag: "-a", desc: "숨김 파일(.으로 시작하는 파일)까지 모두 표시" },
  { flag: "-l", desc: "권한·소유자·크기·수정일 등 상세 정보를 한 줄씩 표시" },
  { flag: "-al", desc: "숨김 파일 + 상세 정보를 함께 표시" },
];

/** ls -l 권한 표기(rwxrwxr--) 해석 */
const permissionGroups = [
  { label: "소유자", value: "rwx", desc: "읽기 · 쓰기 · 실행 모두 가능" },
  { label: "그룹", value: "rwx", desc: "같은 그룹 사용자도 모두 가능" },
  { label: "기타", value: "r--", desc: "그 외 사용자는 읽기만 가능" },
];

/** 개인 PC(Windows) 도커 설치 단계 */
const windowsInstallSteps = [
  {
    step: 1,
    title: "BIOS에서 가상화 기능 켜기",
    description:
      "부팅 시 BIOS에 진입해 Intel Virtualization Technology(AMD는 SVM Mode)를 활성화합니다. 이 옵션이 꺼져 있으면 도커가 실행되지 않습니다.",
  },
  {
    step: 2,
    title: "Hyper-V 활성화",
    description:
      "Windows 기능 켜기/끄기에서 Hyper-V와 가상 머신 플랫폼을 체크한 뒤 재부팅합니다.",
  },
  {
    step: 3,
    title: "Docker Desktop for Windows 설치",
    description:
      "공식 사이트에서 Docker Desktop for Windows를 내려받아 설치하고 실행합니다.",
  },
  {
    step: 4,
    title: "설치 확인",
    description: "터미널에서 버전이 출력되면 설치가 완료된 것입니다.",
    code: "docker -v",
  },
];

/** 리눅스 서버(Ubuntu) 도커 설치 단계 */
const ubuntuInstallSteps = [
  {
    step: 1,
    title: "공식 문서대로 설치",
    description:
      "docker install ubuntu로 검색해 공식 문서(docs.docker.com)의 설치 절차를 그대로 따릅니다.",
    code: "docker -v",
  },
  {
    step: 2,
    title: "현재 사용자를 docker 그룹에 추가",
    description:
      "docker 그룹에 넣어 두면 매번 sudo를 붙이지 않고 docker 명령을 쓸 수 있습니다. ${USER}는 현재 로그인한 사용자 이름으로 자동 치환됩니다.",
    code: "sudo usermod -aG docker ${USER}",
    note: "적용하려면 exit로 로그아웃한 뒤 다시 접속해야 합니다.",
  },
  {
    step: 3,
    title: "재접속으로도 안 되면 재부팅",
    description:
      "그룹 변경이 반영되지 않으면 서버를 재부팅한 뒤 다시 접속합니다.",
    code: "sudo systemctl reboot",
  },
];

/** docker-compose 설치 단계 */
const composeInstallSteps = [
  {
    step: 1,
    title: "standalone 바이너리 내려받기",
    description:
      "docker compose standalone install ubuntu로 검색해 공식 문서의 다운로드 명령을 실행합니다.",
  },
  {
    step: 2,
    title: "실행 권한 부여",
    description:
      "내려받은 파일에 실행 권한(x)을 줘야 명령어로 사용할 수 있습니다.",
    code: "sudo chmod +x /usr/local/bin/docker-compose",
  },
  {
    step: 3,
    title: "설치 확인",
    description: "버전이 출력되면 설치가 완료된 것입니다.",
    code: "docker-compose --version",
  },
];

/** 가상 머신과 컨테이너 비교 */
const vmVsContainer = [
  {
    item: "운영체제",
    vm: "게스트 OS를 통째로 설치",
    container: "호스트의 리눅스 커널을 공유",
  },
  {
    item: "실행 속도",
    vm: "부팅에 수십 초~수 분",
    container: "프로세스 실행 수준으로 수 초",
  },
  {
    item: "자원 사용량",
    vm: "OS 단위로 크게 차지",
    container: "필요한 프로그램만큼만 사용",
  },
];

/** 컨테이너 접속·종료 단계 */
const containerSteps = [
  {
    step: 1,
    title: "Ubuntu 컨테이너 실행",
    description:
      "Ubuntu 이미지를 내려받아 컨테이너를 만들고 바로 셸(bash)에 접속합니다. --name으로 컨테이너 이름을 지정해 두면 다시 접속하기 편합니다.",
    code: "docker run -it --name ubuntu-lab ubuntu:22.04 /bin/bash",
  },
  {
    step: 2,
    title: "실행 중인 컨테이너 확인",
    description:
      "현재 실행 중인 컨테이너 목록을 확인합니다. 멈춘 컨테이너까지 보려면 -a 옵션을 붙입니다.",
    code: `docker ps
docker ps -a`,
  },
  {
    step: 3,
    title: "컨테이너에 다시 접속",
    description:
      "이미 실행 중인 컨테이너 내부 셸로 들어갑니다. 멈춘 상태라면 docker start로 먼저 켭니다.",
    code: `docker start ubuntu-lab
docker exec -it ubuntu-lab /bin/bash`,
  },
  {
    step: 4,
    title: "컨테이너 빠져나오기",
    description:
      "exit를 입력하면 셸에서 나옵니다. 컨테이너를 끄지 않고 나오려면 Ctrl + P, Ctrl + Q를 사용합니다.",
    code: "exit",
  },
];

/** 파일 다루기 명령어 */
const fileCommands = [
  {
    command: "cat",
    summary: "파일 내용 읽기",
    code: "cat test.txt",
    options: [] as { flag: string; desc: string }[],
  },
  {
    command: "rm",
    summary: "파일·폴더 삭제",
    code: `rm test.txt
rm -r 폴더명
rm -rf 폴더명`,
    options: [
      { flag: "-r", desc: "하위 디렉터리까지 함께 삭제 (폴더 삭제 시 필수)" },
      { flag: "-f", desc: "확인 없이 강제로 삭제" },
    ],
  },
  {
    command: "cp",
    summary: "파일·폴더 복사 (cp 원본 대상)",
    code: `cp test.txt ~/test
cp -r 폴더명 ~/backup`,
    options: [
      { flag: "-r", desc: "폴더를 하위 내용까지 통째로 복사" },
      { flag: "-f", desc: "대상 파일이 이미 있으면 덮어쓰기" },
      { flag: "-i", desc: "덮어쓰기 전에 한 번 물어보기" },
    ],
  },
];

/** 프로세스 확인·종료 명령어 */
const processCommands = [
  {
    command: "ps aux",
    summary: "실행 중인 모든 프로세스 상태 확인",
    code: "ps aux",
  },
  {
    command: "ps aux | grep",
    summary: "특정 이름의 프로세스만 골라서 확인",
    code: "ps aux | grep bash",
  },
  {
    command: "kill",
    summary: "PID(프로세스 번호)로 프로세스 종료",
    code: `kill 1234
kill -9 1234`,
  },
];

/** apt-get 패키지 관리 명령어 */
const packageCommands = [
  {
    command: "sudo apt-get update",
    description:
      "패키지 목록(인덱스) 정보를 갱신합니다. 설치된 프로그램 자체가 최신이 되는 것은 아닙니다.",
  },
  {
    command: "sudo apt-get upgrade",
    description: "설치된 패키지를 최신 버전으로 업그레이드합니다.",
  },
  {
    command: "sudo apt-get install 패키지명",
    description: "새 패키지를 설치합니다. 예: sudo apt-get install vim",
  },
  {
    command: "sudo apt-get remove 패키지명",
    description: "설치된 패키지를 삭제합니다.",
  },
];

/** VIM 단축키 */
const vimKeys = [
  { key: "vim 파일명", mode: "셸", desc: "파일을 열거나 새로 만들어 편집 시작" },
  { key: "i", mode: "명령 모드", desc: "입력(insert) 모드로 전환 — 글자 입력 가능" },
  { key: "Esc", mode: "입력 모드", desc: "명령 모드로 돌아가기" },
  { key: "x", mode: "명령 모드", desc: "커서 위치의 글자 한 개 삭제" },
  { key: ":wq", mode: "명령 모드", desc: "저장하고 종료 (write + quit)" },
  { key: ":q!", mode: "명령 모드", desc: "저장하지 않고 강제로 나가기" },
];

/** 이미지·컨테이너 개념 비교 카드 */
const conceptCards = [
  {
    name: "이미지 (Image)",
    analogy: "붕어빵 틀 · 프로그램 설치 파일",
    description:
      "실행에 필요한 프로그램·설정·파일을 통째로 담아 둔 읽기 전용 템플릿입니다. 한 번 만들어지면 내용이 변하지 않습니다.",
    points: [
      "읽기 전용이라 실행해도 내용이 바뀌지 않음",
      "Docker Hub에서 내려받거나 Dockerfile로 직접 빌드",
      "docker images 로 목록 확인",
    ],
    accent:
      "border-violet-200 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-900/10",
    badge:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  },
  {
    name: "컨테이너 (Container)",
    analogy: "붕어빵 · 실행 중인 프로그램",
    description:
      "이미지를 실행해 만들어진 격리된 실행 환경입니다. 이미지 위에 쓰기 공간이 얹혀 있어 파일을 만들고 지울 수 있습니다.",
    points: [
      "이미지 하나로 컨테이너 여러 개를 동시에 실행 가능",
      "중지·재시작·삭제할 수 있고 서로 영향을 주지 않음",
      "docker ps -a 로 목록 확인",
    ],
    accent:
      "border-teal-200 bg-teal-50/60 dark:border-teal-800 dark:bg-teal-900/10",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  },
];

/** 이미지 → 컨테이너 생성 흐름 */
const imageLifecycleFlow = [
  { label: "Dockerfile", caption: "설치 순서를 적은 파일" },
  { label: "docker build", caption: "이미지로 굽기" },
  { label: "이미지", caption: "Docker Hub에서 pull 도 가능" },
  { label: "docker run", caption: "이미지를 실행" },
  { label: "컨테이너", caption: "실제로 동작하는 환경" },
];

/** nginx 웹서버 실습 예제 */
const nginxExampleSteps = [
  {
    step: 1,
    title: "이미지 내려받기",
    description:
      "Docker Hub에서 nginx 웹서버 이미지를 받아옵니다. 아직 실행된 것은 없습니다.",
    code: "docker pull nginx",
  },
  {
    step: 2,
    title: "받아온 이미지 확인",
    description: "내 서버에 저장된 이미지 목록을 봅니다.",
    code: `docker images

REPOSITORY   TAG       IMAGE ID       SIZE
nginx        latest    5ef79149e0ec   188MB`,
  },
  {
    step: 3,
    title: "이미지를 실행해 컨테이너 만들기",
    description:
      "-d는 백그라운드 실행, -p는 포트 연결(내 서버 8080 → 컨테이너 80), --name은 컨테이너 이름입니다.",
    code: "docker run -d -p 8080:80 --name my-web nginx",
  },
  {
    step: 4,
    title: "실행 중인 컨테이너 확인",
    description:
      "STATUS가 Up이면 정상입니다. 브라우저에서 http://서버주소:8080 으로 접속하면 nginx 기본 화면이 보입니다.",
    code: `docker ps

CONTAINER ID   IMAGE   STATUS         PORTS                  NAMES
9f2c1b3a4d5e   nginx   Up 5 seconds   0.0.0.0:8080->80/tcp   my-web`,
  },
  {
    step: 5,
    title: "컨테이너 안으로 들어가 보기",
    description:
      "컨테이너 내부는 독립된 리눅스 환경입니다. 앞에서 배운 ls, pwd 같은 명령어를 그대로 쓸 수 있습니다.",
    code: `docker exec -it my-web /bin/bash
ls /usr/share/nginx/html
exit`,
  },
  {
    step: 6,
    title: "중지하고 다시 시작하기",
    description:
      "중지해도 컨테이너는 남아 있어서 언제든 다시 켤 수 있습니다. 내부에서 만든 파일도 그대로 유지됩니다.",
    code: `docker stop my-web
docker start my-web`,
  },
  {
    step: 7,
    title: "정리하기 (컨테이너 → 이미지 순서)",
    description:
      "컨테이너를 먼저 삭제해야 이미지를 지울 수 있습니다. 이미지를 지워도 다시 pull 하면 됩니다.",
    code: `docker rm -f my-web
docker rmi nginx`,
  },
];

/** 이미지 하나로 컨테이너 여러 개 만들기 예시 */
const multiContainerExample = `docker run -d -p 8081:80 --name web1 nginx
docker run -d -p 8082:80 --name web2 nginx`;

/** 볼륨 연결 예시 (컨테이너 삭제 후에도 데이터 유지) */
const volumeExample =
  "docker run -d -p 8080:80 -v ~/html:/usr/share/nginx/html --name my-web nginx";

/** 이미지·컨테이너 명령어 대응표 */
const imageContainerCommands = [
  {
    task: "목록 보기",
    image: "docker images",
    container: "docker ps -a",
  },
  {
    task: "가져오기 · 실행",
    image: "docker pull 이미지명",
    container: "docker run 이미지명",
  },
  {
    task: "새로 만들기",
    image: "docker build -t 이미지명 .",
    container: "docker commit 컨테이너명 이미지명",
  },
  {
    task: "삭제",
    image: "docker rmi 이미지명",
    container: "docker rm 컨테이너명",
  },
];

/** 한눈에 보기 — 각 섹션으로 이동하는 요약 목록 */
const summaryLinks = [
  { id: "ec2-create", text: "1. EC2 서버 생성 — 리전 서울, 키 페어, 30GB, 탄력적 IP" },
  { id: "ec2-connect", text: "2. 내 PC에서 접속 — chmod 400 + ssh / PuTTY(.ppk)" },
  { id: "shell-basic", text: "3. 셸 기본 명령어 — whoami, pwd, ls" },
  { id: "container-access", text: "4. 컨테이너 접속 — docker run / docker exec" },
  { id: "file-commands", text: "5. 파일 다루기 — cat, rm, cp" },
  { id: "process-commands", text: "6. 프로세스 확인·종료 — ps aux | grep, kill" },
  {
    id: "package-commands",
    text: "7. 패키지 관리 — apt-get update / upgrade / install / remove",
  },
  { id: "vim", text: "8. 파일 편집 — vim (i → Esc → :wq)" },
  { id: "install", text: "9. 도커 설치 — Windows / Ubuntu, docker-compose" },
  { id: "internals", text: "10. Docker Internals — 컨테이너와 가상 머신의 차이" },
  {
    id: "image-container",
    text: "11. 이미지와 컨테이너 — 개념 비교와 nginx 실습 예제",
  },
  {
    id: "image-manage",
    text: "12. 이미지 검색·다운로드와 컨테이너 상태 — search, pull, rmi",
  },
  {
    id: "run-command",
    text: "13. 컨테이너 실행 명령어 — docker run 옵션과 start 차이",
  },
  { id: "dockerfile", text: "14. Dockerfile 작성 — FROM, COPY, RUN, CMD와 build" },
  { id: "compose", text: "15. docker-compose 기본 사용법 — yml 작성과 up/down" },
];

/** 자주 쓰는 공개 이미지 예시 */
const commonImageExamples = [
  {
    name: "ubuntu",
    role: "리눅스 기본 환경",
    description:
      "명령어 실습이나 다른 프로그램을 직접 설치해 볼 때 쓰는 기본 리눅스 이미지입니다.",
  },
  {
    name: "httpd (Apache)",
    role: "웹서버",
    description:
      "아파치 웹서버가 미리 설치된 이미지입니다. 실행하면 바로 웹서버가 동작합니다.",
  },
  {
    name: "nginx",
    role: "웹서버",
    description:
      "가볍고 빠른 웹서버 이미지입니다. 정적 파일 서비스나 리버스 프록시에 많이 사용합니다.",
  },
];

/** Docker Hub 로그인·이미지 관리 명령어 */
const imageManageCommands = [
  {
    command: "docker login",
    summary: "Docker Hub 로그인 (비공개 이미지 받기·올리기에 필요)",
    code: `docker login
docker logout`,
    note: "공개(public) 이미지는 로그인 없이도 내려받을 수 있습니다.",
  },
  {
    command: "docker search",
    summary: "Docker Hub에서 이미지 검색",
    code: "docker search ubuntu",
    note: "OFFICIAL 열에 [OK]가 있으면 공식 이미지입니다.",
  },
  {
    command: "docker pull",
    summary: "이미지 내려받기 (태그를 생략하면 latest)",
    code: `docker pull ubuntu
docker pull ubuntu:22.04`,
  },
  {
    command: "docker images",
    summary: "내려받은 이미지 목록 확인",
    code: `docker images
docker image ls -q`,
    note: "-q(quiet)는 IMAGE ID만 출력합니다. 여러 이미지를 한 번에 지울 때 유용합니다.",
  },
  {
    command: "docker rmi",
    summary: "내려받은 이미지 삭제",
    code: `docker rmi 이미지ID
docker rmi $(docker image ls -q)`,
    note: "해당 이미지로 만든 컨테이너가 남아 있으면 먼저 컨테이너를 삭제해야 합니다.",
  },
];

/** 컨테이너 실행 상태 */
const containerStates = [
  {
    state: "Created",
    label: "생성됨",
    description:
      "컨테이너가 만들어졌지만 아직 시작되지 않은 상태입니다. docker create로 만들면 이 상태가 됩니다.",
    badge:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  {
    state: "Up",
    label: "실행 중",
    description:
      "정상적으로 동작 중인 상태입니다. docker ps 목록에 기본으로 표시됩니다.",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    state: "Paused",
    label: "일시 중지",
    description:
      "프로세스가 멈춰 있지만 메모리 상태는 그대로 유지됩니다. docker unpause로 즉시 재개합니다.",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    state: "Exited",
    label: "종료됨",
    description:
      "컨테이너가 멈춘 상태입니다. 삭제된 것은 아니라서 docker start로 다시 켤 수 있습니다.",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
];

/** docker run 주요 옵션 */
const runOptions = [
  {
    flag: "-i",
    name: "interactive",
    description:
      "컨테이너의 입력(표준 입력)을 열어 둡니다. 이 옵션이 없으면 명령을 입력해도 컨테이너가 받지 못합니다.",
  },
  {
    flag: "-t",
    name: "tty",
    description:
      "가상 터미널을 할당합니다. 셸 프롬프트가 보이고 명령을 입력할 수 있는 환경이 됩니다.",
  },
  {
    flag: "--name",
    name: "컨테이너 이름",
    description:
      "컨테이너에 이름을 붙입니다. 지정하지 않으면 도커가 임의의 이름을 만듭니다.",
  },
  {
    flag: "-d",
    name: "detach",
    description:
      "백그라운드에서 실행합니다. 터미널이 컨테이너에 묶이지 않아 계속 다른 작업을 할 수 있습니다.",
  },
  {
    flag: "--rm",
    name: "자동 삭제",
    description:
      "컨테이너가 종료되면 자동으로 삭제합니다. 잠깐 테스트할 때 찌꺼기를 남기지 않습니다.",
  },
  {
    flag: "-p",
    name: "publish (포트)",
    description:
      "호스트와 컨테이너의 포트를 연결합니다. 형식은 호스트포트:컨테이너포트입니다.",
  },
  {
    flag: "-v",
    name: "volume (디렉터리)",
    description:
      "호스트와 컨테이너의 디렉터리를 연결합니다. 컨테이너를 지워도 데이터가 남습니다.",
  },
];

/** docker run 실행 예제 */
const runExamples = [
  {
    title: "Ubuntu 컨테이너에 바로 접속",
    code: "docker run -it ubuntu",
    description:
      "-i와 -t를 붙여 -it로 씁니다. 실행과 동시에 컨테이너 셸로 들어갑니다.",
  },
  {
    title: "이름을 붙여서 실행",
    code: "docker run -it --name myubuntu ubuntu",
    description:
      "이름을 지정하면 다음부터 docker start myubuntu처럼 이름으로 다룰 수 있습니다.",
  },
  {
    title: "웹서버를 백그라운드로 실행",
    code: "docker run -d -p 8080:80 --name my-web nginx",
    description:
      "-d로 백그라운드 실행하고, 호스트 8080 포트를 컨테이너 80 포트에 연결합니다.",
  },
  {
    title: "한 번만 쓰고 자동 삭제",
    code: "docker run -it --rm ubuntu",
    description:
      "exit로 나오는 순간 컨테이너가 사라집니다. 간단한 확인 작업에 적합합니다.",
  },
];

/** run vs start 차이 */
const runVsStart = [
  {
    item: "역할",
    run: "이미지로 컨테이너를 새로 만들어 실행",
    start: "이미 있는 컨테이너를 다시 실행",
  },
  {
    item: "대상",
    run: "이미지 이름 (예: ubuntu)",
    start: "컨테이너 이름 또는 ID",
  },
  {
    item: "실행할 때마다",
    run: "새 컨테이너가 계속 늘어남",
    start: "같은 컨테이너를 재사용 (내부 파일 유지)",
  },
];

/** Dockerfile 주요 명령어 */
const dockerfileInstructions = [
  {
    keyword: "FROM",
    summary: "베이스 이미지 지정 (반드시 첫 줄)",
    code: "FROM node:20-slim",
    description:
      "어떤 이미지 위에서 시작할지 정합니다. 모든 Dockerfile은 FROM으로 시작합니다.",
  },
  {
    keyword: "WORKDIR",
    summary: "작업 디렉터리 지정",
    code: "WORKDIR /app",
    description:
      "이후 명령이 실행될 기준 경로입니다. 폴더가 없으면 자동으로 만들어 줍니다.",
  },
  {
    keyword: "COPY",
    summary: "호스트 파일을 이미지 안으로 복사",
    code: `COPY package*.json ./
COPY . .`,
    description:
      "빌드하는 위치(빌드 컨텍스트)의 파일을 이미지로 넣습니다. 가장 많이 쓰는 복사 명령입니다.",
  },
  {
    keyword: "ADD",
    summary: "복사 + 압축 해제 · URL 다운로드",
    code: "ADD app.tar.gz /app",
    description:
      "COPY 기능에 tar 자동 해제와 URL 다운로드가 더해진 명령입니다. 특별한 이유가 없으면 COPY를 쓰세요.",
  },
  {
    keyword: "RUN",
    summary: "이미지를 만들 때(빌드 중) 실행할 명령",
    code: `RUN apt-get update && apt-get install -y curl
RUN npm ci`,
    description:
      "패키지 설치처럼 이미지에 남아야 하는 작업을 실행합니다. 실행할 때마다 새 레이어가 생깁니다.",
  },
  {
    keyword: "ENV",
    summary: "환경 변수 설정 (컨테이너 실행 후에도 유지)",
    code: "ENV NODE_ENV=production",
    description:
      "이미지 안에 남는 환경 변수입니다. 실행할 때 docker run -e로 덮어쓸 수 있습니다.",
  },
  {
    keyword: "ARG",
    summary: "빌드할 때만 쓰는 변수",
    code: `ARG VERSION=20
FROM node:${"${VERSION}"}-slim`,
    description:
      "빌드 시점에만 유효합니다. docker build --build-arg VERSION=22 로 값을 넘깁니다.",
  },
  {
    keyword: "EXPOSE",
    summary: "컨테이너가 사용하는 포트를 알림",
    code: "EXPOSE 3000",
    description:
      "문서 역할입니다. 실제 연결은 실행할 때 docker run -p 옵션으로 해야 합니다.",
  },
  {
    keyword: "VOLUME",
    summary: "데이터를 보관할 경로 지정",
    code: 'VOLUME ["/data"]',
    description:
      "해당 경로를 볼륨으로 지정해 컨테이너를 지워도 데이터가 남도록 합니다.",
  },
  {
    keyword: "USER",
    summary: "명령을 실행할 사용자 변경",
    code: "USER node",
    description:
      "기본은 root입니다. 보안을 위해 일반 사용자로 낮춰서 실행하는 것을 권장합니다.",
  },
  {
    keyword: "CMD",
    summary: "컨테이너 시작 시 실행할 기본 명령",
    code: 'CMD ["node", "server.js"]',
    description:
      "docker run 뒤에 명령을 적으면 이 값이 교체됩니다. Dockerfile에 하나만 유효합니다.",
  },
  {
    keyword: "ENTRYPOINT",
    summary: "항상 실행되는 고정 명령",
    code: 'ENTRYPOINT ["node"]',
    description:
      "docker run 뒤에 적은 값은 교체가 아니라 인자로 덧붙습니다. CMD와 함께 쓰면 기본 인자를 정할 수 있습니다.",
  },
];

/** Dockerfile 예제 */
const dockerfileExample = `# 1. 베이스 이미지
FROM node:20-slim

# 2. 작업 디렉터리
WORKDIR /app

# 3. 의존성 먼저 복사 (캐시 활용)
COPY package*.json ./
RUN npm ci

# 4. 나머지 소스 복사
COPY . .

# 5. 환경 변수와 포트
ENV NODE_ENV=production
EXPOSE 3000

# 6. 컨테이너 시작 명령
CMD ["node", "server.js"]`;

/** 이미지 빌드·실행 명령어 */
const dockerBuildSteps = [
  {
    step: 1,
    title: "Dockerfile 작성",
    description:
      "프로젝트 최상위에 Dockerfile이라는 이름(확장자 없음)으로 만듭니다.",
    code: "vim Dockerfile",
  },
  {
    step: 2,
    title: "이미지 빌드",
    description:
      "-t는 이미지 이름(태그)입니다. 맨 뒤의 점(.)은 현재 폴더를 빌드 컨텍스트로 쓴다는 뜻이며 생략할 수 없습니다.",
    code: `docker build -t my-app:1.0 .
docker images`,
  },
  {
    step: 3,
    title: "빌드한 이미지로 컨테이너 실행",
    description:
      "EXPOSE만으로는 접속되지 않으므로 -p로 호스트 포트를 연결합니다.",
    code: "docker run -d -p 3000:3000 --name my-app my-app:1.0",
  },
];

/** RUN · CMD · ENTRYPOINT 비교 */
const runCmdEntrypoint = [
  {
    keyword: "RUN",
    timing: "이미지 빌드 중",
    purpose: "패키지 설치 등 이미지에 남는 작업",
    overridable: "해당 없음",
  },
  {
    keyword: "CMD",
    timing: "컨테이너 시작 시",
    purpose: "기본 실행 명령",
    overridable: "docker run 인자로 교체됨",
  },
  {
    keyword: "ENTRYPOINT",
    timing: "컨테이너 시작 시",
    purpose: "항상 실행되는 고정 명령",
    overridable: "인자로 덧붙음 (교체 아님)",
  },
];

/** Dockerfile 작성 팁 */
const dockerfileTips = [
  "변경이 적은 명령을 위에 두세요. 레이어 캐시가 재사용되어 빌드가 빨라집니다.",
  "의존성 파일(package.json 등)을 먼저 COPY하고 설치한 뒤, 소스 전체를 COPY하세요.",
  "apt-get install은 update와 && 로 한 줄에 묶어야 오래된 캐시로 설치되는 문제를 막습니다.",
  ".dockerignore에 node_modules, .git을 넣어 빌드 컨텍스트 용량을 줄이세요.",
  "CMD는 배열 형식(exec form)으로 쓰는 것이 종료 신호 처리에 안전합니다.",
];

/** docker-compose.yml 주요 항목 */
const composeKeys = [
  {
    keyword: "services",
    summary: "실행할 컨테이너들을 정의하는 최상위 항목",
    description:
      "여기 아래에 적는 이름(web, db 등)이 곧 서비스 이름이자 컨테이너를 부르는 이름이 됩니다.",
  },
  {
    keyword: "image",
    summary: "사용할 이미지 지정",
    description:
      "Docker Hub에서 받아올 이미지를 적습니다. 직접 빌드하지 않을 때 사용합니다.",
  },
  {
    keyword: "build",
    summary: "Dockerfile로 직접 빌드",
    description:
      "image 대신 사용합니다. 값으로 Dockerfile이 있는 경로(보통 .)를 적습니다.",
  },
  {
    keyword: "ports",
    summary: "포트 연결 (docker run -p 와 동일)",
    description: '"호스트포트:컨테이너포트" 형식으로 적습니다.',
  },
  {
    keyword: "volumes",
    summary: "디렉터리·볼륨 연결 (docker run -v 와 동일)",
    description:
      "호스트 경로나 이름 있는 볼륨을 컨테이너 경로에 연결해 데이터를 보존합니다.",
  },
  {
    keyword: "environment",
    summary: "환경 변수 설정",
    description:
      "DB 비밀번호처럼 컨테이너에 전달할 값을 적습니다. .env 파일로 분리할 수도 있습니다.",
  },
  {
    keyword: "depends_on",
    summary: "실행 순서 지정",
    description:
      "먼저 떠야 하는 서비스를 적습니다. 시작 순서만 보장하고, 준비 완료까지 기다리지는 않습니다.",
  },
  {
    keyword: "restart",
    summary: "재시작 정책",
    description:
      "always나 unless-stopped를 주면 서버 재부팅이나 오류 종료 후에도 자동으로 다시 실행됩니다.",
  },
];

/** docker-compose.yml 예제 */
const composeFileExample = `services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=appdb
    volumes:
      - db-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  db-data:`;

/** docker-compose 주요 명령어 */
const composeCommands = [
  {
    command: "docker-compose up -d",
    summary: "정의된 컨테이너를 모두 백그라운드로 실행",
    description:
      "이미지가 없으면 받아오거나 빌드까지 함께 진행합니다. -d를 빼면 로그가 터미널에 계속 출력됩니다.",
  },
  {
    command: "docker-compose ps",
    summary: "이 프로젝트 컨테이너 상태 확인",
    description: "compose 파일에 정의된 서비스만 골라서 보여 줍니다.",
  },
  {
    command: "docker-compose logs -f web",
    summary: "로그 실시간 확인",
    description:
      "서비스 이름을 생략하면 전체 로그가 섞여서 나옵니다. -f는 실시간 추적입니다.",
  },
  {
    command: "docker-compose exec web /bin/bash",
    summary: "실행 중인 컨테이너 안으로 들어가기",
    description:
      "docker exec와 같지만 컨테이너 이름 대신 서비스 이름을 씁니다.",
  },
  {
    command: "docker-compose down",
    summary: "컨테이너와 네트워크 정리",
    description:
      "중지 후 삭제까지 합니다. 볼륨까지 지우려면 -v를 붙이는데, 데이터가 사라지니 주의하세요.",
  },
  {
    command: "docker-compose build",
    summary: "이미지 다시 빌드",
    description:
      "Dockerfile을 수정했을 때 사용합니다. up --build로 빌드와 실행을 한 번에 할 수도 있습니다.",
  },
  {
    command: "docker-compose restart web",
    summary: "특정 서비스만 재시작",
    description: "서비스 이름을 생략하면 전체가 재시작됩니다.",
  },
];

/** 실전 예제 — FastAPI + nginx 폴더 구조 */
const fastapiProjectTree = `프로젝트/
├── backend/
│   ├── main.py           # FastAPI 앱
│   ├── pyproject.toml    # 의존성 목록
│   ├── uv.lock           # 잠금 파일
│   └── Dockerfile        # backend 이미지 빌드 설명서
├── nginx/
│   └── nginx.conf        # 리버스 프록시 설정
├── .env                  # 환경 변수 (backend가 사용)
└── docker-compose.yml    # 두 서비스를 함께 실행`;

/** 실전 예제 — backend/Dockerfile */
const fastapiDockerfile = `FROM python:3.13

# 공식 이미지에 uv가 없으므로 바이너리만 복사
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
# 대문자 UV가 아니라 소문자 uv 명령 사용
RUN uv sync --frozen --no-dev --no-install-project

COPY . .

ENV PATH="/app/.venv/bin:$PATH"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`;

/** 실전 예제 — nginx/nginx.conf */
const fastapiNginxConf = `user nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';
    access_log  /var/log/nginx/access.log  main;
    sendfile on;                    # 응답을 보낼 때 user 영역 buffer 가 아닌, kernel file buffer를 사용
    keepalive_timeout 65;

    upstream fastapi {
        server backend:8000;
    }

    server {
        listen 80;

        location / {
            proxy_pass         http://fastapi;
            proxy_redirect     off;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Host $server_name;
        }
    }
}`;

/** 실전 예제 — docker-compose.yml */
const fastapiComposeFile = `services:
  backend:
    build: ./backend
    env_file:
      - .env

  nginx:
    image: nginx
    ports:
      - 80:80
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend`;

/** 실전 예제 — 설정 포인트 */
const fastapiExamplePoints = [
  {
    title: "backend는 포트를 열지 않습니다",
    description:
      "ports 설정이 없어 외부에서 직접 접근할 수 없습니다. 오직 nginx를 거쳐야만 접속되므로 더 안전합니다.",
  },
  {
    title: "nginx는 서비스 이름으로 backend를 찾습니다",
    description:
      "nginx.conf의 server backend:8000 에서 backend는 compose의 서비스 이름입니다. IP를 몰라도 이름만으로 통신합니다.",
  },
  {
    title: "설정 파일은 볼륨으로 연결합니다",
    description:
      "nginx.conf를 이미지에 굽지 않고 -v로 연결해 두면, 설정을 고친 뒤 재시작만 하면 반영됩니다.",
  },
  {
    title: "의존성 파일을 먼저 복사합니다",
    description:
      "Dockerfile에서 pyproject.toml과 uv.lock을 먼저 COPY하고 uv sync를 실행합니다. 소스만 바뀌면 설치 단계가 캐시로 재사용됩니다.",
  },
  {
    title: "uvicorn은 0.0.0.0으로 실행합니다",
    description:
      "127.0.0.1로 띄우면 컨테이너 안에서만 접속됩니다. 다른 컨테이너(nginx)가 접근하려면 0.0.0.0이어야 합니다.",
  },
];

/** 단독 실행 vs compose 비교 */
const composeVsRun = [
  {
    item: "실행 방법",
    single: "컨테이너마다 docker run 을 각각 입력",
    compose: "docker-compose up -d 한 번",
  },
  {
    item: "설정 관리",
    single: "긴 옵션을 매번 기억해서 입력",
    compose: "docker-compose.yml 파일에 기록 (Git으로 공유)",
  },
  {
    item: "컨테이너 간 통신",
    single: "네트워크를 직접 만들어 연결",
    compose: "같은 네트워크에 자동 연결, 서비스 이름으로 접근",
  },
];

/** 컨테이너 상태 전환 명령어 */
const containerStateCommands = [
  { command: "docker start 컨테이너", desc: "Exited · Created → Up" },
  { command: "docker stop 컨테이너", desc: "Up → Exited (정상 종료)" },
  { command: "docker pause 컨테이너", desc: "Up → Paused (일시 중지)" },
  { command: "docker unpause 컨테이너", desc: "Paused → Up (재개)" },
  { command: "docker rm 컨테이너", desc: "Exited 상태의 컨테이너 삭제" },
];

type InstallStep = {
  step: number;
  title: string;
  description: string;
  code?: string;
  note?: string;
};

/** 설치 단계 목록 (번호 배지 + 설명 + 명령어) */
function InstallStepList({
  steps,
  badgeClassName,
}: {
  steps: InstallStep[];
  badgeClassName: string;
}) {
  return (
    <ol className="space-y-6">
      {steps.map((item) => (
        <li key={item.step} className="flex gap-4">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${badgeClassName}`}
            aria-hidden
          >
            {item.step}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-black dark:text-zinc-50 mb-1">
              {item.title}
            </h4>
            <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
              {item.description}
            </p>
            {item.code ? (
              <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                  {item.code}
                </pre>
              </div>
            ) : null}
            {item.note ? (
              <p className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                → {item.note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function DockerPage() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl justify-center gap-8">
        <div className="w-full min-w-0 max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-sky-600 dark:text-sky-400 mb-2">
            빅데이터 전문가 양성과정
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-zinc-50 mb-3">
            도커
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            AWS EC2 서버 생성·접속부터 도커 컨테이너 안에서 사용하는 리눅스 기본
            명령어와 VIM 편집기 사용법까지 정리했습니다.
          </p>
        </header>

        {/* 요약 카드 */}
        <section
          id="summary"
          className="scroll-mt-20 bg-linear-to-br from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 rounded-lg border border-sky-200 dark:border-sky-800 p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50 mb-3">
            한눈에 보기
          </h2>
          <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            {summaryLinks.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="underline-offset-2 hover:text-sky-700 hover:underline dark:hover:text-sky-300"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ol>
        </section>

        {/* 1. EC2 서버 생성 */}
        <section
          id="ec2-create"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            1. EC2 서버 만들기
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            EC2는 AWS에서 빌려 쓰는 가상 서버입니다. 인스턴스를 만든 뒤 탄력적
            IP를 연결하는 순서로 진행합니다.
          </p>

          <ol className="space-y-6">
            {ec2CreateSteps.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                  aria-hidden
                >
                  {item.step}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                    {item.description}
                  </p>
                  {item.note ? (
                    <p className="mt-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                      → {item.note}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 2. EC2 접속 */}
        <section
          id="ec2-connect"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            2. 내 PC에서 EC2 접속하기
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            내려받은 키 파일과 탄력적 IP로 접속합니다. Ubuntu 이미지의 기본
            사용자 이름은{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              ubuntu
            </code>
            입니다.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {ec2ConnectGuides.map((guide) => (
              <div
                key={guide.os}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <h3 className="text-base font-semibold text-black dark:text-zinc-50 mb-1">
                  {guide.os}
                </h3>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {guide.description}
                </p>
                <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-xs sm:text-sm whitespace-pre-wrap">
                    {guide.code}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. 셸과 기본 명령어 */}
        <section
          id="shell-basic"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            3. 셸(shell)과 기본 명령어
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            <strong>셸</strong>은 사용자가 입력한 명령을 컴퓨터 하드웨어(운영체제)
            에 전달하는 인터페이스입니다. 리눅스의 대표 셸은{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              bash
            </code>
            입니다.
          </p>

          <ul className="space-y-6">
            {shellBasicCommands.map((item) => (
              <li
                key={item.command}
                className="border-l-2 border-cyan-200 dark:border-cyan-800 pl-4"
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <code className="rounded bg-cyan-100 px-2 py-0.5 font-mono text-sm font-semibold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
                    {item.command}
                  </code>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {item.summary}
                  </span>
                </div>
                <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                    {item.code}
                  </pre>
                </div>
              </li>
            ))}
          </ul>

          {/* ls 옵션 */}
          <div className="mt-6 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <h3 className="text-base font-semibold text-black dark:text-zinc-50 mb-2">
              ls 옵션
            </h3>
            <ul className="space-y-1.5">
              {lsOptions.map((option) => (
                <li
                  key={option.flag}
                  className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <code className="shrink-0 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {option.flag}
                  </code>
                  <span>{option.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 권한 표기 해석 */}
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="text-base font-semibold text-black dark:text-zinc-50 mb-1">
              권한 표기 읽는 법
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
                ls -l
              </code>
              을 실행하면 맨 앞에{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
                rwxrwxr--
              </code>{" "}
              같은 권한이 표시됩니다. 세 글자씩 끊어서 읽습니다. (r 읽기 · w 쓰기
              · x 실행)
            </p>
            <ul className="grid gap-2 sm:grid-cols-3">
              {permissionGroups.map((group) => (
                <li
                  key={group.label}
                  className="rounded-md bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                >
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {group.label}
                  </p>
                  <code className="font-mono text-base font-semibold text-black dark:text-zinc-50">
                    {group.value}
                  </code>
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {group.desc}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              접속용 키 파일에 사용하는{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
                chmod 400
              </code>
              은 소유자에게 읽기 권한만 주고 나머지는 모두 막는다는 뜻입니다.
            </p>
          </div>
        </section>

        {/* 4. 컨테이너 접속 */}
        <section
          id="container-access"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            4. 컨테이너 접속하기
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            아래 docker 명령어는 도커가 설치된 서버(또는 내 PC) 셸에서
            실행합니다. 접속 이후 5~8번의 리눅스 명령어는 컨테이너 내부 셸에서
            실행합니다.
          </p>

          <ol className="space-y-6">
            {containerSteps.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                  aria-hidden
                >
                  {item.step}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                      {item.code}
                    </pre>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 5. 파일 다루기 */}
        <section
          id="file-commands"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-6">
            5. 파일 다루기 — cat, rm, cp
          </h2>

          <ul className="space-y-6">
            {fileCommands.map((item) => (
              <li
                key={item.command}
                className="border-l-2 border-sky-200 dark:border-sky-800 pl-4"
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <code className="rounded bg-sky-100 px-2 py-0.5 font-mono text-sm font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                    {item.command}
                  </code>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {item.summary}
                  </span>
                </div>

                <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                    {item.code}
                  </pre>
                </div>

                {item.options.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {item.options.map((option) => (
                      <li
                        key={option.flag}
                        className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <code className="shrink-0 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {option.flag}
                        </code>
                        <span>{option.desc}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* 6. 프로세스 확인·종료 */}
        <section
          id="process-commands"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            6. 프로세스 확인·종료 — ps, kill
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              ps aux
            </code>{" "}
            결과의 두 번째 열이 <strong>PID(프로세스 번호)</strong>입니다. 이
            번호로 프로세스를 종료합니다.
          </p>

          <ul className="space-y-6">
            {processCommands.map((item) => (
              <li
                key={item.command}
                className="border-l-2 border-emerald-200 dark:border-emerald-800 pl-4"
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <code className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-sm font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {item.command}
                  </code>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {item.summary}
                  </span>
                </div>
                <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                    {item.code}
                  </pre>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              kill
            </code>
            은 정상 종료 요청,{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              kill -9
            </code>
            는 강제 종료입니다. 강제 종료는 저장되지 않은 작업이 사라질 수 있으니
            먼저 일반 kill을 사용하세요.
          </p>
        </section>

        {/* 7. 패키지 관리 */}
        <section
          id="package-commands"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            7. 패키지 관리 — apt-get
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            Ubuntu에서 프로그램을 설치·삭제하는 명령어입니다. 설치 전에는 항상{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              update
            </code>
            를 먼저 실행합니다.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700 text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    명령어
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    설명
                  </th>
                </tr>
              </thead>
              <tbody>
                {packageCommands.map((item, index) => (
                  <tr
                    key={item.command}
                    className={
                      index % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
                    }
                  >
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 align-top">
                      <code className="font-mono text-xs sm:text-sm font-semibold text-black dark:text-zinc-50">
                        {item.command}
                      </code>
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg bg-sky-50 border border-sky-200 p-4 text-sm text-sky-900 dark:bg-sky-900/10 dark:border-sky-800 dark:text-sky-200/90">
            도커 Ubuntu 이미지는 기본 사용자가 root이고 sudo가 설치되어 있지 않을
            수 있습니다. 이때는{" "}
            <code className="rounded bg-sky-100 px-1 text-xs dark:bg-sky-900/40">
              sudo
            </code>
            를 빼고{" "}
            <code className="rounded bg-sky-100 px-1 text-xs dark:bg-sky-900/40">
              apt-get update
            </code>
            처럼 실행하면 됩니다.
          </div>
        </section>

        {/* 8. VIM 사용법 */}
        <section
          id="vim"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            8. VIM 사용법
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            VIM은 <strong>명령 모드</strong>와 <strong>입력 모드</strong>가 나뉜
            편집기입니다. 글자를 입력하려면 먼저 입력 모드로 들어가야 합니다.
          </p>

          {/* 모드 흐름 */}
          <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            {[
              "vim 파일명",
              "i (입력 모드)",
              "내용 편집",
              "Esc (명령 모드)",
              ":wq (저장 후 종료)",
            ].map((label, index, list) => (
              <li key={label} className="flex items-center gap-2">
                <span className="rounded-md bg-violet-100 px-2.5 py-1 font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                  {label}
                </span>
                {index < list.length - 1 ? (
                  <span className="text-zinc-400" aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700 text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    입력
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    사용 위치
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    동작
                  </th>
                </tr>
              </thead>
              <tbody>
                {vimKeys.map((item, index) => (
                  <tr
                    key={item.key}
                    className={
                      index % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
                    }
                  >
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2">
                      <code className="font-mono text-sm font-semibold text-black dark:text-zinc-50">
                        {item.key}
                      </code>
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {item.mode}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {item.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 주의사항 */}
        <section
          id="caution"
          className="scroll-mt-20 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-3">
            실습 시 주의사항
          </h2>
          <ul className="space-y-2 text-sm text-yellow-900 dark:text-yellow-200/90 list-disc list-inside">
            <li>
              키 페어(.pem)는 재발급되지 않습니다. 분실하면 서버에 접속할 수
              없으니 안전한 곳에 보관하세요.
            </li>
            <li>
              탄력적 IP를 연결하지 않으면 인스턴스를 재시작할 때마다 공인 IP가
              바뀝니다.
            </li>
            <li>
              실습이 끝나면 인스턴스를 중지하고, 사용하지 않는 탄력적 IP는
              해제하세요. 연결되지 않은 탄력적 IP에는 요금이 부과됩니다.
            </li>
            <li>
              <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded text-xs">
                rm -rf
              </code>
              는 확인 없이 지우고 복구할 수 없습니다. 경로를 반드시 확인한 뒤
              실행하세요.
            </li>
            <li>
              <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded text-xs">
                apt-get update
              </code>
              는 패키지 목록만 갱신합니다. 실제 업그레이드는{" "}
              <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded text-xs">
                upgrade
              </code>
              까지 실행해야 합니다.
            </li>
            <li>
              VIM이 종료되지 않으면 Esc를 먼저 누른 뒤{" "}
              <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded text-xs">
                :q!
              </code>
              를 입력하세요.
            </li>
            <li>
              컨테이너를 삭제하면 내부에서 만든 파일도 함께 사라집니다. 남겨야 할
              결과물은 호스트로 복사하거나 볼륨을 사용하세요.
            </li>
            <li>
              Git 기초는{" "}
              <Link
                href="/git-how"
                className="font-medium text-yellow-800 underline dark:text-yellow-300"
              >
                깃이란?
              </Link>{" "}
              페이지를 참고하세요.
            </li>
          </ul>
        </section>

        {/* 9. 도커 설치 */}
        <section
          id="install"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            9. 도커 설치
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            개인 PC(Windows)와 리눅스 서버(Ubuntu)는 설치 방법이 다릅니다. 설치
            후에는 항상{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              docker -v
            </code>
            로 버전을 확인합니다.
          </p>

          {/* 개인 PC */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
            개인 PC (Windows)
          </h3>
          <InstallStepList
            steps={windowsInstallSteps}
            badgeClassName="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
          />

          {/* 리눅스 서버 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-4">
            리눅스 서버 (Ubuntu)
          </h3>
          <InstallStepList
            steps={ubuntuInstallSteps}
            badgeClassName="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
          />

          {/* docker-compose */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-2">
            docker-compose 설치
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm">
            여러 컨테이너를 설정 파일 하나로 함께 실행하는 도구입니다. Ubuntu
            서버에는 standalone 버전을 내려받아 실행 권한을 줍니다.
          </p>
          <InstallStepList
            steps={composeInstallSteps}
            badgeClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          />
        </section>

        {/* 10. Docker Internals */}
        <section
          id="internals"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            10. Docker Internals
          </h2>
          <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed mb-6">
            <strong>리눅스 컨테이너</strong>는 한 대의 서버 안에서 별도의 가상
            컴퓨터처럼 동작하는 격리된 실행 환경입니다. 프로세스·파일 시스템·
            네트워크가 서로 분리되어 있어, 같은 서버에서 여러 프로그램을 충돌
            없이 실행할 수 있습니다.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700 text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    구분
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    가상 머신(VM)
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    컨테이너
                  </th>
                </tr>
              </thead>
              <tbody>
                {vmVsContainer.map((row, index) => (
                  <tr
                    key={row.item}
                    className={
                      index % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
                    }
                  >
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50 whitespace-nowrap">
                      {row.item}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {row.vm}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {row.container}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            컨테이너는 호스트의 리눅스 커널을 공유하기 때문에 가상 머신보다 가볍고
            빠르게 실행됩니다.
          </p>
        </section>

        {/* 11. 이미지와 컨테이너 */}
        <section
          id="image-container"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            11. 도커 이미지와 컨테이너
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            도커를 쓸 때 가장 자주 헷갈리는 두 개념입니다. 한 문장으로 정리하면{" "}
            <strong>이미지는 틀, 컨테이너는 그 틀로 찍어낸 결과물</strong>입니다.
          </p>

          {/* 개념 대비 카드 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {conceptCards.map((card) => (
              <div
                key={card.name}
                className={`rounded-lg border p-4 ${card.accent}`}
              >
                <h3 className="text-base font-semibold text-black dark:text-zinc-50">
                  {card.name}
                </h3>
                <p
                  className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium ${card.badge}`}
                >
                  {card.analogy}
                </p>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {card.description}
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  {card.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="text-zinc-400" aria-hidden>
                        ·
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 생성 흐름 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-3">
            만들어지는 흐름
          </h3>
          <ol className="flex flex-wrap items-stretch gap-2">
            {imageLifecycleFlow.map((node, index, list) => (
              <li key={node.label} className="flex items-center gap-2">
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
                  <p className="font-mono text-sm font-semibold text-black dark:text-zinc-50">
                    {node.label}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {node.caption}
                  </p>
                </div>
                {index < list.length - 1 ? (
                  <span className="text-zinc-400" aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          {/* 실습 예제 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-2">
            예제: nginx 웹서버 띄워보기
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm">
            이미지를 받아 컨테이너로 실행하고 정리하는 전체 과정입니다. 명령어를
            순서대로 따라 하면 됩니다.
          </p>
          <InstallStepList
            steps={nginxExampleSteps}
            badgeClassName="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
          />

          {/* 이미지 하나 → 컨테이너 여러 개 */}
          <div className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="text-base font-semibold text-black dark:text-zinc-50 mb-1">
              이미지 1개 → 컨테이너 여러 개
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              같은 nginx 이미지로 컨테이너를 여러 개 만들 수 있습니다. 포트와
              이름만 다르게 지정하면 됩니다.
            </p>
            <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                {multiContainerExample}
              </pre>
            </div>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              web1 안에서 파일을 지워도 web2와 원본 이미지에는 아무 영향이
              없습니다. 컨테이너끼리는 완전히 분리되어 있습니다.
            </p>
          </div>

          {/* 명령어 대응표 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-3">
            명령어 비교
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700 text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    작업
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    이미지
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    컨테이너
                  </th>
                </tr>
              </thead>
              <tbody>
                {imageContainerCommands.map((row, index) => (
                  <tr
                    key={row.task}
                    className={
                      index % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
                    }
                  >
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50 whitespace-nowrap">
                      {row.task}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2">
                      <code className="font-mono text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                        {row.image}
                      </code>
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2">
                      <code className="font-mono text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                        {row.container}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-200/90">
            <strong>데이터는 컨테이너와 함께 사라집니다.</strong> 컨테이너를
            삭제하면 그 안에서 만든 파일도 지워집니다. 계속 보관해야 할 데이터는{" "}
            <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900/40">
              -v
            </code>{" "}
            옵션으로 서버 폴더와 연결해 두세요.
            <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-3 overflow-x-auto">
              <pre className="text-green-400 font-mono text-xs sm:text-sm whitespace-pre-wrap">
                {volumeExample}
              </pre>
            </div>
          </div>
        </section>

        {/* 12. 이미지 검색·다운로드와 컨테이너 상태 */}
        <section
          id="image-manage"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            12. 이미지 검색·다운로드와 컨테이너 상태
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            이미지는 <strong>Docker Hub</strong>라는 저장소에서 내려받습니다.
            검색 → 다운로드 → 확인 → 삭제 순서로 다루고, 그 이미지로 만든
            컨테이너가 지금 어떤 상태인지 읽는 법까지 정리했습니다.
          </p>

          {/* 자주 쓰는 이미지 예시 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-3">
            자주 쓰는 이미지
          </h3>
          <ul className="grid gap-3 sm:grid-cols-3">
            {commonImageExamples.map((image) => (
              <li
                key={image.name}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <code className="font-mono text-sm font-semibold text-black dark:text-zinc-50">
                  {image.name}
                </code>
                <p className="mt-1 inline-block rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                  {image.role}
                </p>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {image.description}
                </p>
              </li>
            ))}
          </ul>

          {/* 이미지 관리 명령어 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-3">
            이미지 다루기 명령어
          </h3>
          <ul className="space-y-6">
            {imageManageCommands.map((item) => (
              <li
                key={item.command}
                className="border-l-2 border-violet-200 dark:border-violet-800 pl-4"
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <code className="rounded bg-violet-100 px-2 py-0.5 font-mono text-sm font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                    {item.command}
                  </code>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {item.summary}
                  </span>
                </div>
                <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                    {item.code}
                  </pre>
                </div>
                {item.note ? (
                  <p className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400">
                    → {item.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          {/* 컨테이너 실행 상태 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-2">
            컨테이너의 실행 상태
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm">
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              docker ps -a
            </code>{" "}
            의 STATUS 열에 표시되는 값입니다. 상태에 따라 다시 켤 수 있는지가
            달라집니다.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {containerStates.map((item) => (
              <li
                key={item.state}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <code
                    className={`rounded px-2 py-0.5 font-mono text-sm font-semibold ${item.badge}`}
                  >
                    {item.state}
                  </code>
                  <span className="text-sm font-medium text-black dark:text-zinc-50">
                    {item.label}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>

          {/* 상태 전환 명령어 */}
          <div className="mt-6 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <h4 className="text-base font-semibold text-black dark:text-zinc-50 mb-2">
              상태를 바꾸는 명령어
            </h4>
            <ul className="space-y-1.5">
              {containerStateCommands.map((item) => (
                <li
                  key={item.command}
                  className="flex flex-wrap gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <code className="shrink-0 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.command}
                  </code>
                  <span className="text-zinc-400" aria-hidden>
                    →
                  </span>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-lg bg-sky-50 border border-sky-200 p-4 text-sm text-sky-900 dark:bg-sky-900/10 dark:border-sky-800 dark:text-sky-200/90">
            <strong>Exited는 삭제가 아닙니다.</strong> 종료된 컨테이너도 목록에
            그대로 남아 디스크를 차지합니다.{" "}
            <code className="rounded bg-sky-100 px-1 text-xs dark:bg-sky-900/40">
              docker ps -a
            </code>
            로 확인한 뒤 필요 없는 것은{" "}
            <code className="rounded bg-sky-100 px-1 text-xs dark:bg-sky-900/40">
              docker rm
            </code>
            으로 정리하세요.
          </div>
        </section>

        {/* 13. 컨테이너 실행 명령어 */}
        <section
          id="run-command"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            13. 컨테이너 실행 명령어
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            컨테이너를 실행하는 명령은 두 가지입니다.{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              docker run
            </code>
            은 이미지로 컨테이너를 <strong>새로 만들어</strong> 실행하고,{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              docker start
            </code>
            는 이미 만들어 둔 컨테이너를 <strong>다시</strong> 실행합니다.
          </p>

          {/* run vs start */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700 text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    구분
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    docker run
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    docker start
                  </th>
                </tr>
              </thead>
              <tbody>
                {runVsStart.map((row, index) => (
                  <tr
                    key={row.item}
                    className={
                      index % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
                    }
                  >
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50 whitespace-nowrap">
                      {row.item}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {row.run}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {row.start}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {`docker start 컨테이너이름
docker run [옵션] 이미지이름 [실행할명령]`}
            </pre>
          </div>

          {/* run 옵션 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-3">
            docker run 주요 옵션
          </h3>
          <ul className="space-y-3">
            {runOptions.map((option) => (
              <li
                key={option.flag}
                className="flex flex-col gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 sm:flex-row sm:gap-4"
              >
                <div className="flex shrink-0 items-baseline gap-2 sm:w-40">
                  <code className="rounded bg-orange-100 px-2 py-0.5 font-mono text-sm font-semibold text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                    {option.flag}
                  </code>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {option.name}
                  </span>
                </div>
                <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {option.description}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4 text-sm text-zinc-700 dark:text-zinc-300">
            <code className="rounded bg-zinc-200 px-1 font-mono text-xs dark:bg-zinc-700">
              -i
            </code>
            와{" "}
            <code className="rounded bg-zinc-200 px-1 font-mono text-xs dark:bg-zinc-700">
              -t
            </code>
            는 거의 항상 같이 쓰기 때문에{" "}
            <code className="rounded bg-zinc-200 px-1 font-mono text-xs dark:bg-zinc-700">
              -it
            </code>
            로 붙여서 씁니다. 컨테이너 안에서 직접 명령을 입력하려면 이 조합이
            필요합니다.
          </div>

          {/* 실행 예제 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-3">
            실행 예제
          </h3>
          <ul className="space-y-5">
            {runExamples.map((example) => (
              <li
                key={example.title}
                className="border-l-2 border-orange-200 dark:border-orange-800 pl-4"
              >
                <h4 className="text-base font-semibold text-black dark:text-zinc-50 mb-1">
                  {example.title}
                </h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {example.description}
                </p>
                <div className="mt-3 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                    {example.code}
                  </pre>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-200/90">
            <strong>run을 반복하면 컨테이너가 계속 쌓입니다.</strong> 같은
            작업을 이어서 하려면 새로 run 하지 말고{" "}
            <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900/40">
              docker start
            </code>{" "}
            +{" "}
            <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900/40">
              docker exec -it
            </code>
            로 기존 컨테이너에 다시 들어가세요.
          </div>
        </section>

        {/* 14. Dockerfile 작성 */}
        <section
          id="dockerfile"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            14. Dockerfile 작성
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            <strong>Dockerfile</strong>은 이미지를 만드는 설치 설명서입니다. 위에서
            아래로 한 줄씩 실행되며, 각 명령이 하나의 <strong>레이어</strong>로
            쌓여 이미지가 완성됩니다.
          </p>

          {/* 명령어 목록 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-3">
            주요 명령어
          </h3>
          <ul className="space-y-5">
            {dockerfileInstructions.map((item) => (
              <li
                key={item.keyword}
                className="border-l-2 border-indigo-200 dark:border-indigo-800 pl-4"
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <code className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-sm font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                    {item.keyword}
                  </code>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {item.summary}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
                <div className="mt-2 bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                    {item.code}
                  </pre>
                </div>
              </li>
            ))}
          </ul>

          {/* RUN vs CMD vs ENTRYPOINT */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-3">
            RUN · CMD · ENTRYPOINT 차이
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700 text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    명령
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    실행 시점
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    용도
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    실행 시 인자
                  </th>
                </tr>
              </thead>
              <tbody>
                {runCmdEntrypoint.map((row, index) => (
                  <tr
                    key={row.keyword}
                    className={
                      index % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
                    }
                  >
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2">
                      <code className="font-mono text-xs sm:text-sm font-semibold text-black dark:text-zinc-50">
                        {row.keyword}
                      </code>
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {row.timing}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {row.purpose}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {row.overridable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 전체 예제 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-2">
            전체 예제
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-3 text-sm">
            Node.js 앱을 이미지로 만드는 기본 형태입니다. 의존성을 먼저 설치하고
            소스를 나중에 복사하는 순서가 핵심입니다.
          </p>
          <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {dockerfileExample}
            </pre>
          </div>

          {/* 빌드·실행 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-3">
            빌드하고 실행하기
          </h3>
          <InstallStepList
            steps={dockerBuildSteps}
            badgeClassName="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
          />

          {/* 작성 팁 */}
          <div className="mt-8 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <h3 className="text-base font-semibold text-black dark:text-zinc-50 mb-2">
              작성 팁
            </h3>
            <ul className="space-y-1.5">
              {dockerfileTips.map((tip) => (
                <li
                  key={tip}
                  className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <span className="text-zinc-400" aria-hidden>
                    ·
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-200/90">
            <strong>EXPOSE는 포트를 열어 주지 않습니다.</strong> 문서 역할만
            하므로, 외부에서 접속하려면 실행할 때{" "}
            <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900/40">
              -p 3000:3000
            </code>
            처럼 포트를 직접 연결해야 합니다.
          </div>
        </section>

        {/* 15. docker-compose 기본 사용법 */}
        <section
          id="compose"
          className="scroll-mt-20 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
            15. docker-compose 기본 사용법
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            웹서버와 데이터베이스처럼 여러 컨테이너를 함께 써야 할 때, 실행
            옵션을{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              docker-compose.yml
            </code>{" "}
            파일 하나에 적어 두고 명령 한 번으로 전부 실행하는 도구입니다.
          </p>

          {/* 단독 실행과 비교 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-300 dark:border-zinc-700 text-sm">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    구분
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    docker run
                  </th>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-left text-black dark:text-zinc-50">
                    docker-compose
                  </th>
                </tr>
              </thead>
              <tbody>
                {composeVsRun.map((row, index) => (
                  <tr
                    key={row.item}
                    className={
                      index % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
                    }
                  >
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-medium text-black dark:text-zinc-50 whitespace-nowrap">
                      {row.item}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {row.single}
                    </td>
                    <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {row.compose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* yml 주요 항목 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-3">
            docker-compose.yml 주요 항목
          </h3>
          <ul className="space-y-4">
            {composeKeys.map((item) => (
              <li
                key={item.keyword}
                className="border-l-2 border-emerald-200 dark:border-emerald-800 pl-4"
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <code className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-sm font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {item.keyword}
                  </code>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {item.summary}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>

          {/* yml 예제 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-2">
            작성 예제
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-3 text-sm">
            웹 앱(web)과 데이터베이스(db)를 함께 띄우는 구성입니다. 들여쓰기는
            공백 2칸으로 맞추고 탭은 쓰지 않습니다.
          </p>
          <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {composeFileExample}
            </pre>
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            web 컨테이너에서 데이터베이스에 접속할 때는 IP 대신 서비스 이름인{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              db
            </code>
            를 호스트명으로 씁니다. compose가 두 컨테이너를 같은 네트워크에
            자동으로 연결해 주기 때문입니다.
          </p>

          {/* 명령어 */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-8 mb-3">
            주요 명령어
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm">
            모든 명령은{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              docker-compose.yml
            </code>
            이 있는 폴더에서 실행합니다.
          </p>
          <ul className="space-y-4">
            {composeCommands.map((item) => (
              <li
                key={item.command}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <div className="bg-zinc-900 dark:bg-black rounded-lg p-3 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                    {item.command}
                  </pre>
                </div>
                <p className="mt-2 text-sm font-medium text-black dark:text-zinc-50">
                  {item.summary}
                </p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg bg-sky-50 border border-sky-200 p-4 text-sm text-sky-900 dark:bg-sky-900/10 dark:border-sky-800 dark:text-sky-200/90">
            <strong>
              docker-compose 와 docker compose 는 같은 기능입니다.
            </strong>{" "}
            하이픈이 있는 쪽은 별도로 설치하는 예전 방식(standalone), 띄어쓴 쪽은
            도커에 내장된 최신 방식입니다. 설치 환경에 맞는 쪽을 쓰면 됩니다.
          </div>

          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-200/90">
            <strong>down -v 는 데이터를 지웁니다.</strong>{" "}
            <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900/40">
              docker-compose down
            </code>
            은 컨테이너만 정리하지만,{" "}
            <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900/40">
              -v
            </code>
            를 붙이면 볼륨에 저장된 데이터베이스 내용까지 함께 삭제됩니다.
          </div>

          {/* 실전 예제 — FastAPI + nginx */}
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mt-10 mb-2">
            실전 예제: FastAPI + nginx
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm">
            FastAPI 앱을 nginx 뒤에 두는 구성입니다. 외부 요청은 nginx(80
            포트)가 받아서 내부의 backend(8000 포트)로 넘겨 줍니다.
          </p>

          {/* 요청 흐름 */}
          <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            {[
              "브라우저",
              "nginx :80",
              "backend :8000",
              "FastAPI 응답",
            ].map((label, index, list) => (
              <li key={label} className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {label}
                </span>
                {index < list.length - 1 ? (
                  <span className="text-zinc-400" aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          {/* 폴더 구조 */}
          <h4 className="text-base font-semibold text-black dark:text-zinc-50 mb-2">
            폴더 구조
          </h4>
          <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 font-mono text-sm whitespace-pre">
              {fastapiProjectTree}
            </pre>
          </div>

          {/* backend/Dockerfile */}
          <h4 className="text-base font-semibold text-black dark:text-zinc-50 mt-6 mb-1">
            backend/Dockerfile
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            파이썬 패키지 관리 도구인 <strong>uv</strong>로 의존성을 설치한 뒤
            uvicorn으로 앱을 실행합니다.
          </p>
          <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {fastapiDockerfile}
            </pre>
          </div>

          {/* nginx/nginx.conf */}
          <h4 className="text-base font-semibold text-black dark:text-zinc-50 mt-6 mb-1">
            nginx/nginx.conf
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            80 포트로 들어온 요청을 <strong>upstream fastapi</strong>(=
            backend:8000)로 전달하는 리버스 프록시 설정입니다.
          </p>
          <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 font-mono text-sm whitespace-pre">
              {fastapiNginxConf}
            </pre>
          </div>

          {/* docker-compose.yml */}
          <h4 className="text-base font-semibold text-black dark:text-zinc-50 mt-6 mb-1">
            docker-compose.yml
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            backend는 Dockerfile로 빌드하고, nginx는 공식 이미지를 그대로
            사용하면서 설정 파일만 연결합니다.
          </p>
          <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {fastapiComposeFile}
            </pre>
          </div>

          {/* 설정 포인트 */}
          <h4 className="text-base font-semibold text-black dark:text-zinc-50 mt-6 mb-3">
            눈여겨볼 점
          </h4>
          <ul className="space-y-3">
            {fastapiExamplePoints.map((point) => (
              <li
                key={point.title}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
              >
                <p className="text-sm font-medium text-black dark:text-zinc-50">
                  {point.title}
                </p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {point.description}
                </p>
              </li>
            ))}
          </ul>

          {/* 실행 방법 */}
          <h4 className="text-base font-semibold text-black dark:text-zinc-50 mt-6 mb-2">
            실행하기
          </h4>
          <div className="bg-zinc-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {`docker-compose up -d --build
docker-compose ps
docker-compose logs -f backend`}
            </pre>
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            브라우저에서{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
              http://서버주소
            </code>{" "}
            로 접속하면 nginx를 거쳐 FastAPI 응답이 보입니다. 80 포트라서 주소에
            포트 번호를 붙이지 않아도 됩니다.
          </p>

          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-200/90">
            <strong>.env 파일이 없으면 실행되지 않습니다.</strong>{" "}
            <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900/40">
              env_file
            </code>
            에 적은 파일은 반드시 있어야 합니다. 비밀 값이 들어가므로{" "}
            <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900/40">
              .gitignore
            </code>
            에 추가해 저장소에 올라가지 않게 하세요.
          </div>
        </section>
        </div>

        <DockerToc />
      </div>
    </div>
  );
}
