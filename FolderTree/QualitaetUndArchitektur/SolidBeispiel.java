public class SolidBeispiel {
    interface NachrichtenSender {
        void senden(String nachricht);
    }

    static class BenachrichtigungsService {
        private final NachrichtenSender sender;

        public BenachrichtigungsService(NachrichtenSender sender) {
            this.sender = sender;
        }

        public void benachrichtigen(String nachricht) {
            this.sender.senden(nachricht);
        }
    }
}
