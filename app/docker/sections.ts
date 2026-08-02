/** 도커 페이지 섹션 목록 — 본문 앵커와 오른쪽 목차가 공유 */
export type DockerSection = {
  id: string;
  label: string;
};

export const DOCKER_SECTIONS: DockerSection[] = [
  { id: "summary", label: "한눈에 보기" },
  { id: "ec2-create", label: "1. EC2 서버 만들기" },
  { id: "ec2-connect", label: "2. EC2 접속하기" },
  { id: "shell-basic", label: "3. 셸과 기본 명령어" },
  { id: "container-access", label: "4. 컨테이너 접속하기" },
  { id: "file-commands", label: "5. 파일 다루기" },
  { id: "process-commands", label: "6. 프로세스 확인·종료" },
  { id: "package-commands", label: "7. 패키지 관리" },
  { id: "vim", label: "8. VIM 사용법" },
  { id: "caution", label: "실습 시 주의사항" },
  { id: "install", label: "9. 도커 설치" },
  { id: "internals", label: "10. Docker Internals" },
  { id: "image-container", label: "11. 이미지와 컨테이너" },
  { id: "image-manage", label: "12. 이미지 검색·컨테이너 상태" },
  { id: "run-command", label: "13. 컨테이너 실행 명령어" },
  { id: "dockerfile", label: "14. Dockerfile 작성" },
  { id: "compose", label: "15. docker-compose 사용법" },
];
