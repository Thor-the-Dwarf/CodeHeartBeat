public class ThreadBeispiel {
    public static void main(String[] args) throws InterruptedException {
        Thread thread = new Thread(() -> System.out.println("Arbeit im zweiten Thread"));
        thread.start();
        thread.join();

        System.out.println("Hauptthread beendet.");
    }
}
