import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ExecutorServiceBeispiel {
    public static void main(String[] args) {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        executor.submit(() -> System.out.println("Aufgabe A"));
        executor.submit(() -> System.out.println("Aufgabe B"));
        executor.shutdown();
    }
}
